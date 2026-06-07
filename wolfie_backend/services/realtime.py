"""
╔══════════════════════════════════════════════════════════════╗
║     WOLFIE DELIVERY — real_time_service.py                   ║
║     Compatible with app.py (RealTimeService(socketio=...))  ║
╚══════════════════════════════════════════════════════════════╝
"""

import logging
from database import transaction
from database.repositories.rating import DriverLocationRepository
from datetime import datetime, timezone

logger = logging.getLogger("wolfie")
UTC    = timezone.utc


class RealTimeService:

    def __init__(self, socketio):
        self.sio = socketio
        logger.info("RealTimeService: ready")

    # ── Driver location ───────────────────────

    def update_driver_location(self, driver_id: str, lat: float,
                                lng: float, order_id: str = None):
        """Persist GPS + broadcast to order room."""
        from flask import current_app
        db  = getattr(current_app, "db", None)
        now = datetime.now(UTC).isoformat()

        if db:
            try:
                db.table("driver_locations").upsert({
                    "driver_id":  driver_id,
                    "lat":        lat,
                    "lng":        lng,
                    "order_id":   order_id,
                    "updated_at": now,
                }).execute()
            except Exception as e:
                logger.warning(f"update_driver_location DB: {e}")

        if order_id:
            self.sio.emit(
                "driver_location",
                {"driver_id": driver_id, "lat": lat, "lng": lng, "ts": now},
                room=f"order_{order_id}"
            )

    # ── Order status broadcast ─────────────────

    def broadcast_order_status(self, order_id: str, status: str, extra: dict = None):
        payload = {"order_id": order_id, "status": status}
        if extra:
            payload.update(extra)
        self.sio.emit("order_status_update", payload, room=f"order_{order_id}")
        logger.debug(f"broadcast_order_status: {order_id} → {status}")

    # ── Payment events ────────────────────────

    def broadcast_payment_confirmed(self, order_id: str):
        self.sio.emit("payment_confirmed", {"order_id": order_id}, room=f"order_{order_id}")

    def broadcast_payment_failed(self, order_id: str):
        self.sio.emit("payment_failed", {"order_id": order_id}, room=f"order_{order_id}")

    # ── Chat ──────────────────────────────────

    def send_chat(self, order_id: str, sender: str, message: str):
        self.sio.emit("chat_message", {
            "order_id": order_id,
            "sender":   sender,
            "message":  message,
            "ts":       datetime.now(UTC).isoformat(),
        }, room=f"order_{order_id}")

    # ── Driver availability broadcast ─────────

    def broadcast_driver_available(self, driver_id: str, is_available: bool):
        self.sio.emit("driver_availability", {
            "driver_id":    driver_id,
            "is_available": is_available,
        })

    # ── Keep-alive ping ───────────────────────

    def ping_room(self, order_id: str):
        self.sio.emit("ping", {"order_id": order_id}, room=f"order_{order_id}")

    # ── Admin & Support Events (Placeholders) ─

    def broadcast_admin_alert(self, alert_type: str, payload: dict):
        """Placeholder for emitting high-priority alerts to operations center."""
        self.sio.emit("admin_alert", {"type": alert_type, "data": payload}, room="admin_ops")
        logger.debug(f"broadcast_admin_alert: {alert_type}")

    def broadcast_support_ticket_update(self, ticket_id: str, status: str):
        """Placeholder for updating support agent dashboards in real-time."""
        self.sio.emit("support_ticket_update", {"ticket_id": ticket_id, "status": status}, room="admin_support")
    
    def broadcast_fraud_flag(self, user_id: str, risk_type: str):
        """Placeholder for notifying fraud analysts of real-time suspicious activity."""
        self.sio.emit("fraud_flag_alert", {"user_id": user_id, "risk_type": risk_type}, room="admin_fraud")

    def broadcast_restaurant_delay(self, restaurant_id: str, delay_min: int):
        """Placeholder for alerting ops of kitchen bottlenecks."""
        self.sio.emit("restaurant_delay_alert", {"restaurant_id": restaurant_id, "delay_min": delay_min}, room="admin_ops")
