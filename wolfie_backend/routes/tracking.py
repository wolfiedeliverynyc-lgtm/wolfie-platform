"""
╔══════════════════════════════════════════════════════════════╗
║   WOLFIE DELIVERY — routes/tracking.py  (v3 — Repositories) ║
╚══════════════════════════════════════════════════════════════╝
"""

import logging
from flask import Blueprint, request, jsonify, current_app
from routes.auth import require_auth
from database import get_db_session
from database.repositories import OrderRepository
from database.repositories.rating import DriverLocationRepository

tracking_bp = Blueprint("tracking", __name__)
logger      = logging.getLogger("wolfie")


@tracking_bp.route("/<order_id>", methods=["GET"])
@require_auth(["customer", "driver", "admin"])
def get_order_tracking(order_id):
    with get_db_session() as session:
        order_repo = OrderRepository(session)
        order      = order_repo.get(order_id)
        if not order:
            return jsonify({"error": "Order not found"}), 404

        driver_loc = None
        if order.driver_id:
            # 1. Try Redis cache first (freshest data, sub-ms)
            redis = getattr(current_app, "redis", None)
            if redis:
                cached = redis.locations.get(order.driver_id)
                if cached:
                    driver_loc = cached

            # 2. Fall back to PostgreSQL if not in cache
            if not driver_loc:
                loc_repo = DriverLocationRepository(session)
                loc      = loc_repo.get_for_driver(order.driver_id)
                if loc:
                    driver_loc = {
                        "lat":        loc.lat,
                        "lng":        loc.lng,
                        "updated_at": loc.updated_at.isoformat() if loc.updated_at else None,
                    }

        updated_eta = order.eta_minutes
        mapbox      = getattr(current_app, "mapbox", None)
        if mapbox and driver_loc and order.delivery_address:
            try:
                route       = mapbox.get_route(
                    f"{driver_loc['lat']},{driver_loc['lng']}",
                    order.delivery_address,
                )
                updated_eta = route.get("duration_min", updated_eta)
            except Exception:
                pass

        return jsonify({
            "order_id":         order_id,
            "status":           order.status,
            "driver_id":        order.driver_id,
            "driver_location":  driver_loc,
            "eta_minutes":      updated_eta,
            "pickup_address":   order.pickup_address,
            "delivery_address": order.delivery_address,
            "created_at":       order.created_at.isoformat() if order.created_at else None,
            "picked_up_at":     order.picked_up_at.isoformat() if order.picked_up_at else None,
            "delivered_at":     order.delivered_at.isoformat() if order.delivered_at else None,
        }), 200
