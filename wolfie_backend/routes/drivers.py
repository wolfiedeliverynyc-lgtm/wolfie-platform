"""
╔══════════════════════════════════════════════════════════════╗
║   WOLFIE DELIVERY — routes/drivers.py  (v3 — Repositories)  ║
╚══════════════════════════════════════════════════════════════╝
"""

import logging
from flask import Blueprint, request, jsonify
from routes.auth import require_auth
from database import transaction, get_db_session
from flask import current_app
from database.repositories import OrderRepository, UserRepository
from database.repositories.rating import DriverLocationRepository

drivers_bp = Blueprint("drivers", __name__)
logger     = logging.getLogger("wolfie")


def _emit(event, data, room=None):
    try:
        from flask import current_app
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


@drivers_bp.route("/status", methods=["PATCH"])
@require_auth(["driver"])
def update_availability():
    data         = request.get_json(silent=True) or {}
    is_available = data.get("is_available")
    if is_available is None:
        return jsonify({"error": "is_available required"}), 400

    try:
        with transaction() as session:
            repo = UserRepository(session)
            user = repo.get_or_404(request.user_id)
            repo.update(user, is_available=bool(is_available))
    except LookupError as e:
        return jsonify({"error": str(e)}), 404

    _emit("driver_availability", {
        "driver_id": request.user_id, "is_available": bool(is_available)
    })
    
    # Broadcast to admin room for fleet management
    try:
        from app import socketio
        socketio.emit("driver_status_update", {
            "driver_id": request.user_id,
            "status": "available" if is_available else "offline"
        }, room="admin")
    except Exception:
        pass

    return jsonify({"is_available": bool(is_available)}), 200


@drivers_bp.route("/active-order", methods=["GET"])
@require_auth(["driver"])
def get_active_order():
    with get_db_session() as session:
        repo  = OrderRepository(session)
        order = repo.find_active_for_driver(request.user_id)
        return jsonify({"order": repo.to_dict(order) if order else None}), 200


@drivers_bp.route("/earnings", methods=["GET"])
@require_auth(["driver"])
def get_earnings():
    with get_db_session() as session:
        repo   = OrderRepository(session)
        orders = repo.find_by_driver(request.user_id, status="delivered")
        total  = sum(o.driver_payout or 0 for o in orders)
        return jsonify({
            "driver_id":        request.user_id,
            "total_deliveries": len(orders),
            "total_earnings":   round(total, 2),
        }), 200


import math

def _haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

@drivers_bp.route("/location", methods=["POST"])
@require_auth(["driver"])
def update_location():
    data     = request.get_json(silent=True) or {}
    lat      = data.get("lat")
    lng      = data.get("lng")
    order_id = data.get("order_id")

    if lat is None or lng is None:
        return jsonify({"error": "lat and lng required"}), 400

    lat, lng = float(lat), float(lng)

    # 1. Anti-Teleportation Coordinate Validation
    redis = getattr(current_app, "redis", None)
    if redis:
        last_loc = redis.locations.get(request.user_id)
        if last_loc and last_loc.get("lat") and last_loc.get("lng"):
            dist = _haversine_distance(lat, lng, float(last_loc["lat"]), float(last_loc["lng"]))
            # If distance is over 500 meters from the last known point in a very short time,
            # this is likely a GPS glitch / teleportation. We drop the bad coordinate.
            if dist > 500:
                logger.warning(f"GPS Teleportation detected for driver {request.user_id}: jumped {int(dist)}m. Ignoring.")
                return jsonify({"status": "ignored", "reason": "teleportation"}), 200

    # 2. Write to Redis cache immediately (sub-ms)
    if redis:
        redis.locations.update(request.user_id, lat, lng, order_id)

    # 2. Persist to PostgreSQL every 5th update (configurable)
    # For now persist every time; add counter logic if needed
    try:
        with transaction() as session:
            repo = DriverLocationRepository(session)
            repo.upsert(request.user_id, lat, lng, order_id)
    except Exception as e:
        logger.error(f"update_location DB persist failed: {e}")
        # Don't fail — Redis cache is source of truth for realtime

    # 3. Broadcast via WebSocket
    if order_id:
        _emit("driver_location", {
            "driver_id": request.user_id, "lat": lat, "lng": lng
        }, room=f"order_{order_id}")

    # Also broadcast to admin room for fleet tracking
    _emit("driver_location", {
        "driver_id": request.user_id, "lat": lat, "lng": lng
    }, room="admin")

    return jsonify({"status": "ok"}), 200


@drivers_bp.route("/orders/history", methods=["GET"])
@require_auth(["driver"])
def driver_order_history():
    limit  = int(request.args.get("limit",  20))
    offset = int(request.args.get("offset",  0))
    with get_db_session() as session:
        repo   = OrderRepository(session)
        orders = repo.find_by_driver(request.user_id)
        page   = orders[offset: offset + limit]
        return jsonify({
            "orders": [repo.to_dict(o) for o in page],
            "count":  len(page),
        }), 200
