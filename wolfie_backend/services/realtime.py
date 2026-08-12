"""
╔══════════════════════════════════════════════════════════════╗
║     WOLFIE DELIVERY — real_time_service.py                   ║
║     Tracks active connections, broadcasts status updates,    ║
║     integrates message versioning, and manages driver state. ║
╚══════════════════════════════════════════════════════════════╝
"""

import logging
import time
from database import transaction
from database.repositories.rating import DriverLocationRepository
from datetime import datetime, timezone
from services.metrics import ws_events_total

logger = logging.getLogger("wolfie")
UTC    = timezone.utc


class RealTimeService:

    def __init__(self, socketio):
        self.sio = socketio
        logger.info("RealTimeService: ready")

    def _emit(self, event: str, payload: dict, room: str = None):
        """Helper to emit event and track Prometheus counters."""
        ws_events_total.labels(event=event).inc()
        if room:
            self.sio.emit(event, payload, room=room)
        else:
            self.sio.emit(event, payload)

    # ── Driver location ───────────────────────

    def update_driver_location(self, driver_id: str, lat: float,
                                lng: float, order_id: str = None):
        """Persist GPS + broadcast to order room."""
        from flask import current_app
        redis_inst = getattr(current_app, "redis", None)
        db         = getattr(current_app, "db", None)
        now        = datetime.now(UTC).isoformat()

        # 1. Update in-memory Redis cache for fast retrieval (e.g. SmartMatching)
        if redis_inst:
            try:
                redis_inst.locations.update(driver_id, lat, lng, order_id)
            except Exception as e:
                logger.warning(f"Failed to update driver location in Redis: {e}")

        # 2. Throttled DB Persistence: Save to PostgreSQL only once every 30 seconds
        if db:
            should_save_db = True
            if redis_inst:
                try:
                    throttle_key = f"driver:{driver_id}:last_db_save"
                    if redis_inst.cache.get(throttle_key):
                        should_save_db = False
                    else:
                        redis_inst.cache.set(throttle_key, "true", ttl=30)
                except Exception as e:
                    logger.warning(f"Error checking location throttling: {e}")

            if should_save_db:
                try:
                    db.table("driver_locations").upsert({
                        "driver_id":  driver_id,
                        "lat":        lat,
                        "lng":        lng,
                        "order_id":   order_id,
                        "updated_at": now,
                    }).execute()
                    logger.debug(f"Persisted driver {driver_id} location to DB (unthrottled checkpoint)")
                except Exception as e:
                    logger.warning(f"update_driver_location DB failed: {e}")

        # 3. Broadcast real-time location to WebSocket rooms with timestamp (version)
        location_payload = {
            "driver_id": driver_id,
            "lat": lat,
            "lng": lng,
            "ts": now,
            "version": int(time.time() * 1000)  # Message Version (Observation 4)
        }

        if order_id:
            self._emit("driver_location", location_payload, room=f"order_{order_id}")

        # Also broadcast to admin room for fleet tracking
        self._emit("driver_location", location_payload, room="admin")

    # ── Order status broadcast ─────────────────

    def broadcast_order_status(self, order_id: str, status: str, extra: dict = None, version: int = None):
        """Broadcast status update to room with incremental version checks (Observation 4)."""
        payload = {
            "order_id": order_id,
            "status": status,
            "version": version or int(time.time() * 1000)  # Safe fallback version (Observation 4)
        }
        if extra:
            payload.update(extra)
        
        self._emit("order_status_update", payload, room=f"order_{order_id}")
        self._emit("order_status_update", payload, room="admin")
        logger.debug(f"broadcast_order_status: {order_id} → {status} (v={payload['version']})")

    # ── Payment events ────────────────────────

    def broadcast_payment_confirmed(self, order_id: str):
        payload = {
            "order_id": order_id,
            "version": int(time.time() * 1000)
        }
        self._emit("payment_confirmed", payload, room=f"order_{order_id}")

    def broadcast_payment_failed(self, order_id: str):
        payload = {
            "order_id": order_id,
            "version": int(time.time() * 1000)
        }
        self._emit("payment_failed", payload, room=f"order_{order_id}")

    # ── Chat ──────────────────────────────────

    def send_chat(self, order_id: str, sender: str, message: str):
        self._emit("chat_message", {
            "order_id": order_id,
            "sender":   sender,
            "message":  message,
            "ts":       datetime.now(UTC).isoformat(),
            "version":  int(time.time() * 1000)
        }, room=f"order_{order_id}")

    # ── Driver availability broadcast ─────────

    def broadcast_driver_available(self, driver_id: str, is_available: bool):
        self._emit("driver_availability", {
            "driver_id":    driver_id,
            "is_available": is_available,
            "version":      int(time.time() * 1000)
        })

    def broadcast_driver_offline(self, driver_id: str):
        """
        Notify that a driver has disconnected/gone offline (Observation 2).
        Alerts admin tracking and any active matching channels.
        """
        payload = {
            "driver_id": driver_id,
            "is_available": False,
            "offline": True,
            "ts": datetime.now(UTC).isoformat(),
            "version": int(time.time() * 1000)
        }
        self._emit("driver_offline", payload, room="admin")
        self._emit("driver_availability", payload)
        logger.info(f"Broadcasted driver offline status for {driver_id}")

    # ── Keep-alive ping ───────────────────────

    def ping_room(self, order_id: str):
        self._emit("ping", {
            "order_id": order_id,
            "version": int(time.time() * 1000)
        }, room=f"order_{order_id}")

    # ── Admin & Support Events ───────────────

    def broadcast_admin_alert(self, alert_type: str, payload: dict):
        alert_data = {
            "type": alert_type,
            "data": payload,
            "version": int(time.time() * 1000)
        }
        self._emit("admin_alert", alert_data, room="admin_ops")
        logger.debug(f"broadcast_admin_alert: {alert_type}")

    def broadcast_support_ticket_update(self, ticket_id: str, status: str):
        payload = {
            "ticket_id": ticket_id,
            "status": status,
            "version": int(time.time() * 1000)
        }
        self._emit("support_ticket_update", payload, room="admin_support")
    
    def broadcast_fraud_flag(self, user_id: str, risk_type: str):
        payload = {
            "user_id": user_id,
            "risk_type": risk_type,
            "version": int(time.time() * 1000)
        }
        self._emit("fraud_flag_alert", payload, room="admin_fraud")

    def broadcast_restaurant_delay(self, restaurant_id: str, delay_min: int):
        payload = {
            "restaurant_id": restaurant_id,
            "delay_min": delay_min,
            "version": int(time.time() * 1000)
        }
        self._emit("restaurant_delay_alert", payload, room="admin_ops")
