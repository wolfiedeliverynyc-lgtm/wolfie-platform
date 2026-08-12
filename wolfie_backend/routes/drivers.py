"""
╔══════════════════════════════════════════════════════════════╗
║   WOLFIE DELIVERY — routes/drivers.py  (v4 — Services)      ║
╚══════════════════════════════════════════════════════════════╝
"""

import logging
from flask import Blueprint, request, jsonify, current_app
from routes.auth import require_auth
from database import get_db_session
from database.repositories import OrderRepository
from services.redis_service import rate_limit
from services.driver_service import DriverService

drivers_bp = Blueprint("drivers", __name__)
logger     = logging.getLogger("wolfie")
driver_service = DriverService()


@drivers_bp.route("/status", methods=["PATCH"])
@require_auth(["driver"])
@rate_limit(limit=5, window=60, key_func=lambda: f"driver_status:{getattr(request, 'user_id', request.remote_addr)}")
def update_availability():
    data         = request.get_json(silent=True) or {}
    is_available = data.get("is_available")
    if is_available is None:
        return jsonify({"error": "is_available required"}), 400

    try:
        res = driver_service.update_availability(request.user_id, is_available)
        return jsonify(res), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        logger.exception(f"update_availability endpoint failed: {e}")
        return jsonify({"error": "Failed to update availability"}), 500


@drivers_bp.route("/active-order", methods=["GET"])
@require_auth(["driver"])
def get_active_order():
    try:
        res = driver_service.get_active_order(request.user_id)
        return jsonify(res), 200
    except Exception as e:
        logger.exception(f"get_active_order endpoint failed: {e}")
        return jsonify({"error": "Failed to retrieve active order"}), 500


@drivers_bp.route("/earnings", methods=["GET"])
@require_auth(["driver"])
def get_earnings():
    try:
        res = driver_service.get_earnings(request.user_id)
        return jsonify(res), 200
    except Exception as e:
        logger.exception(f"get_earnings endpoint failed: {e}")
        return jsonify({"error": "Failed to retrieve earnings"}), 500


@drivers_bp.route("/location", methods=["POST"])
@require_auth(["driver"])
def update_location():
    data     = request.get_json(silent=True) or {}
    lat      = data.get("lat")
    lng      = data.get("lng")
    order_id = data.get("order_id")
    ts       = data.get("timestamp") or data.get("timestamp_ms")

    if lat is None or lng is None:
        return jsonify({"error": "lat and lng required"}), 400

    try:
        res = driver_service.update_location(request.user_id, lat, lng, order_id, ts)
        return jsonify(res), 200
    except Exception as e:
        logger.exception(f"update_location endpoint failed: {e}")
        return jsonify({"error": "Failed to update location"}), 500


@drivers_bp.route("/<driver_id>/location", methods=["PATCH", "POST"])
@require_auth(["driver", "admin"])
def update_location_by_id(driver_id):
    if getattr(request, "user_role", None) == "driver" and request.user_id != driver_id:
        return jsonify({"error": "Unauthorized: Cannot update another driver's location"}), 403

    data     = request.get_json(silent=True) or {}
    lat      = data.get("lat")
    lng      = data.get("lng")
    order_id = data.get("order_id")
    ts       = data.get("timestamp") or data.get("timestamp_ms")

    if lat is None or lng is None:
        return jsonify({"error": "lat and lng required"}), 400

    try:
        res = driver_service.update_location_by_id(driver_id, lat, lng, order_id, ts)
        return jsonify(res), 200
    except Exception as e:
        logger.exception(f"update_location_by_id endpoint failed: {e}")
        return jsonify({"error": "Failed to update location"}), 500


@drivers_bp.route("/orders/history", methods=["GET"])
@require_auth(["driver"])
def driver_order_history():
    limit  = int(request.args.get("limit",  20))
    offset = int(request.args.get("offset",  0))
    status = request.args.get("status")
    with get_db_session() as session:
        repo   = OrderRepository(session)
        orders = repo.find_by_driver(request.user_id, status=status, limit=limit, offset=offset)
        return jsonify({
            "orders": [repo.to_dict(o) for o in orders],
            "count":  len(orders),
        }), 200
