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

        # BOLA/IDOR Ownership Check
        is_admin = getattr(request, "user_role", None) == "admin"
        if not is_admin:
            if request.user_id not in [order.customer_id, order.driver_id]:
                return jsonify({"error": "Unauthorized to track this order"}), 403

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
        route_info  = None

        if mapbox and driver_loc and order.delivery_address:
            try:
                route_info  = mapbox.get_route(
                    f"{driver_loc['lat']},{driver_loc['lng']}",
                    order.delivery_address,
                )
                if route_info:
                    updated_eta = route_info.get("duration_min", updated_eta)
            except Exception as e:
                current_app.logger.warning(f"ETA recalculation failed for order {order.id}: {e}")

        # 1. Compute Dynamic Traffic Density from Mapbox route speed
        traffic_info = {
            "density": "moderate",
            "label": "Moderate",
            "icon": "🚗"
        }
        if route_info and route_info.get("duration_min") and route_info.get("distance_km"):
            try:
                dist = float(route_info["distance_km"])
                dur = float(route_info["duration_min"])
                if dur > 0:
                    avg_speed = (dist / (dur / 60.0))  # km/h
                    if avg_speed < 18:
                        traffic_info = {"density": "heavy", "label": "Heavy Traffic", "icon": "🛑"}
                    elif avg_speed < 32:
                        traffic_info = {"density": "moderate", "label": "Moderate", "icon": "🚗"}
                    else:
                        traffic_info = {"density": "low", "label": "Flowing", "icon": "🟢"}
            except Exception as te:
                logger.warning(f"Failed to calculate traffic density: {te}")

        # 2. Compute Live Weather Info from WeatherService
        weather_info = {
            "code": "clear",
            "label": "Clear",
            "icon": "☀️",
            "temp_c": None,
            "multiplier": 1.0
        }
        weather_svc = getattr(current_app, "weather_service", None)
        if weather_svc:
            target_lat = getattr(order, "delivery_lat", None)
            target_lng = getattr(order, "delivery_lng", None)

            if target_lat is None or target_lng is None:
                if driver_loc and driver_loc.get("lat") and driver_loc.get("lng"):
                    target_lat = driver_loc["lat"]
                    target_lng = driver_loc["lng"]
                elif mapbox and order.delivery_address:
                    try:
                        geo = mapbox.geocode(order.delivery_address)
                        if geo:
                            target_lat = geo.get("lat")
                            target_lng = geo.get("lng")
                    except Exception:
                        pass

            if target_lat is not None and target_lng is not None:
                try:
                    weather_info = weather_svc.get_weather_details(float(target_lat), float(target_lng))
                except Exception as we:
                    logger.warning(f"Weather details fetch failed in tracking: {we}")

        raw_proof = getattr(order, "proof_photo_url", getattr(order, "delivery_proof_photo_url", None))
        proof_photo_url = raw_proof if isinstance(raw_proof, str) else None

        return jsonify({
            "order_id":         order_id,
            "status":           str(order.status) if order.status is not None else "pending",
            "driver_id":        order.driver_id if isinstance(order.driver_id, str) else None,
            "driver_location":  driver_loc,
            "eta_minutes":      float(updated_eta) if isinstance(updated_eta, (int, float)) else None,
            "traffic":          traffic_info,
            "weather":          weather_info,
            "proof_photo_url":  proof_photo_url,
            "pickup_address":   order.pickup_address if isinstance(order.pickup_address, str) else None,
            "delivery_address": order.delivery_address if isinstance(order.delivery_address, str) else None,
            "created_at":       order.created_at.isoformat() if hasattr(order.created_at, "isoformat") else None,
            "picked_up_at":     order.picked_up_at.isoformat() if hasattr(order.picked_up_at, "isoformat") else None,
            "delivered_at":     order.delivered_at.isoformat() if hasattr(order.delivered_at, "isoformat") else None,
        }), 200

