"""
╔══════════════════════════════════════════════════════════════╗
║   WOLFIE DELIVERY — services/driver_service.py               ║
╚══════════════════════════════════════════════════════════════╝
"""

import logging
import math
from flask import current_app
from database import transaction, get_db_session
from database.repositories import OrderRepository, UserRepository
from database.repositories.rating import DriverLocationRepository

logger = logging.getLogger("wolfie.driver_service")


def _emit(event, data, room=None):
    try:
        socketio = current_app.extensions.get("socketio")
        if not socketio:
            from app import socketio
        
        logger.info(f"[_emit] Emitting event: {event} with data: {data} to room: {room}")
        socketio.emit(event, data, room=room, namespace="/")
        socketio.emit(event, data, namespace="/")  # Broadcast to everyone without room restriction
        
        try:
            import eventlet
            eventlet.sleep(0)
        except ImportError:
            pass
            
        logger.info(f"[_emit] Emit completed.")
    except Exception as e:
        logger.exception(f"Error in _emit: {e}")


def _haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


class DriverService:

    def update_availability(self, driver_id: str, is_available: bool) -> dict:
        try:
            with transaction() as session:
                repo = UserRepository(session)
                user = repo.get_or_404(driver_id)
                repo.update(user, is_available=bool(is_available))
        except LookupError as e:
            raise ValueError(str(e))

        _emit("driver_availability", {
            "driver_id": driver_id, "is_available": bool(is_available)
        })
        
        # Broadcast to admin room for fleet management
        try:
            socketio = current_app.extensions.get("socketio")
            if not socketio:
                from app import socketio
            socketio.emit("driver_status_update", {
                "driver_id": driver_id,
                "status": "available" if is_available else "offline"
            }, room="admin")
        except Exception as e:
            current_app.logger.warning(f"Failed to broadcast driver status to admin: {e}")

        return {"is_available": bool(is_available)}

    def get_active_order(self, driver_id: str) -> dict:
        with get_db_session() as session:
            repo  = OrderRepository(session)
            order = repo.find_active_for_driver(driver_id)
            return {"order": repo.to_dict(order) if order else None}

    def get_earnings(self, driver_id: str) -> dict:
        redis = getattr(current_app, "redis", None)
        cache_key = f"driver_earnings:{driver_id}"
        
        if redis:
            cached_data = redis.cache.get(cache_key)
            if cached_data is not None:
                logger.info(f"Serving driver earnings from cache for {driver_id}")
                return cached_data

        with get_db_session() as session:
            repo = OrderRepository(session)
            count, total = repo.get_driver_earnings_summary(driver_id)
            
        response_data = {
            "driver_id":        driver_id,
            "total_deliveries": count,
            "total_earnings":   round(total, 2),
        }

        if redis:
            # Cache for 60 seconds
            redis.cache.set(cache_key, response_data, ttl=60)

        return response_data

    def update_location(self, driver_id: str, lat: float, lng: float, order_id: str = None, timestamp: float = None) -> dict:
        import json
        lat, lng = float(lat), float(lng)

        # 1. Anti-Teleportation Coordinate Validation
        redis = getattr(current_app, "redis", None)
        if redis:
            last_loc = redis.locations.get(driver_id)
            if last_loc and last_loc.get("lat") and last_loc.get("lng"):
                dist = _haversine_distance(lat, lng, float(last_loc["lat"]), float(last_loc["lng"]))
                # If distance is over 500 meters from the last known point in a very short time,
                # this is likely a GPS glitch / teleportation. We drop the bad coordinate.
                if dist > 500:
                    logger.warning(f"GPS Teleportation detected for driver {driver_id}: jumped {int(dist)}m. Ignoring.")
                    return {"status": "ignored", "reason": "teleportation"}

        # 2. Write to Redis cache immediately (sub-ms) and verify sequencing
        if redis:
            success = redis.locations.update(driver_id, lat, lng, order_id, timestamp)
            if not success:
                return {"status": "ignored", "reason": "out-of-order"}

        # 3. Throttle database persistence of driver locations (avoid writing on every ping)
        should_persist = True
        if redis:
            persist_key = f"driver_persist_count:{driver_id}"
            last_persisted_key = f"driver_last_persisted_loc:{driver_id}"
            
            try:
                count = redis._manager.client(db=4).incr(persist_key)
                redis._manager.client(db=4).expire(persist_key, 3600)
            except Exception:
                count = 1

            # Only persist to PostgreSQL if:
            # - Count is a multiple of 10 (every ~30-50 seconds)
            # - OR there is a critical order_id update
            # - OR they moved > 50 meters from their last persisted position
            if count % 10 != 0 and not order_id:
                should_persist = False
                try:
                    last_persisted = redis._manager.client(db=4).get(last_persisted_key)
                    if last_persisted:
                        lp_data = json.loads(last_persisted)
                        dist = _haversine_distance(lat, lng, float(lp_data["lat"]), float(lp_data["lng"]))
                        if dist > 50:
                            should_persist = True
                    else:
                        should_persist = True
                except Exception:
                    should_persist = True

        if should_persist:
            try:
                with transaction() as session:
                    repo = DriverLocationRepository(session)
                    repo.upsert(driver_id, lat, lng, order_id)
                # Cache the last persisted coordinate in Redis
                if redis:
                    try:
                        redis._manager.client(db=4).setex(last_persisted_key, 3600, json.dumps({"lat": lat, "lng": lng}))
                    except Exception:
                        pass
            except Exception as e:
                logger.error(f"update_location DB persist failed: {e}")
                # Don't fail — Redis cache is source of truth for realtime

        # 4. Broadcast via WebSocket
        if order_id:
            _emit("driver_location", {
                "driver_id": driver_id, "lat": lat, "lng": lng
            }, room=f"order_{order_id}")

        # Also broadcast to admin room for fleet tracking
        _emit("driver_location", {
            "driver_id": driver_id, "lat": lat, "lng": lng
        }, room="admin")

        return {"status": "ok"}

    def update_location_by_id(self, driver_id: str, lat: float, lng: float, order_id: str = None, timestamp: float = None) -> dict:
        res = self.update_location(driver_id, lat, lng, order_id, timestamp)
        if res.get("status") == "ignored":
            return {"status": "ignored", "reason": res.get("reason")}
        return {"status": "updated", "message": "Location updated"}
