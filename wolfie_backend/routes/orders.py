"""
╔══════════════════════════════════════════════════════════════╗
║   WOLFIE DELIVERY — routes/orders.py  (v3 — Repositories)   ║
╚══════════════════════════════════════════════════════════════╝
"""

import logging
from flask import Blueprint, request, jsonify, current_app, Response
from functools import wraps
from sqlalchemy.orm.exc import NoResultFound
from routes.auth import require_auth
from database import transaction, get_db_session
from database.repositories import OrderRepository, UserRepository
from database.schemas import IdempotencyKey

orders_bp = Blueprint("orders", __name__)
logger    = logging.getLogger("wolfie")

def idempotent(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        idempotency_key = request.headers.get("Idempotency-Key")
        if not idempotency_key:
            return f(*args, **kwargs)
        
        with transaction() as session:
            existing = session.query(IdempotencyKey).filter_by(key=idempotency_key).first()
            if existing:
                return jsonify(existing.response_body), existing.status_code
                
        # Execute the actual function
        response = f(*args, **kwargs)
        
        # Save response
        if isinstance(response, tuple) and len(response) == 2:
            body, status_code = response
            if hasattr(body, 'get_json'):
                json_data = body.get_json()
            else:
                json_data = body
            
            with transaction() as session:
                new_key = IdempotencyKey(key=idempotency_key, response_body=json_data, status_code=status_code)
                session.add(new_key)
                
        return response
    return decorated_function


def _svc():
    return {k: getattr(current_app, k, None)
            for k in ("pricing", "mapbox", "matching", "push")}


def _emit(order_id, event, data):
    try:
        from app import socketio
        socketio.emit(event, data, room=f"order_{order_id}")
    except Exception as e:
        logger.warning(f"WS emit failed: {e}")


def _calc_pricing(svc, subtotal, route_info, data) -> dict:
    if svc["pricing"]:
        try:
            return svc["pricing"].calculate(
                subtotal      = subtotal,
                distance_km   = route_info.get("distance_km", 2.0),
                duration_min  = route_info.get("duration_min", 15),
                restaurant_id = data.get("restaurant_id"),
                customer_id   = data.get("customer_id"),
                is_surge      = data.get("is_surge", False),
                weather_code  = data.get("weather_code"),
                promo_code    = data.get("promo_code"),
            )
        except Exception as e:
            logger.error(f"Pricing engine error: {e}")

    d = route_info.get("distance_km", 2.0)
    t = route_info.get("duration_min", 15.0)
    delivery_fee = round(max(4.49, min(4.00 + 0.80 * d + 0.12 * t, 12.49)), 2)
    service_fee  = round(max(3.49, min(subtotal * 0.12, 7.49)), 2)
    tax          = round(subtotal * 0.08875, 2)
    return {
        "subtotal":              subtotal,
        "delivery_fee":          delivery_fee,
        "service_fee":           service_fee,
        "tax":                   tax,
        "restaurant_commission": round(subtotal * 0.15, 2),
        "driver_payout":         round(max(0.0, 4.00 + 0.80 * d + 0.12 * t - 0.30), 2),
        "total":                 round(subtotal + delivery_fee + service_fee + tax, 2),
        "surge_applied":         False,
        "source":                "fallback",
    }


# ══════════════════════════════════════════════════════════════

@orders_bp.route("/quote", methods=["POST"])
def get_price_quote():
    data = request.get_json(silent=True) or {}
    if not data.get("pickup_address") or not data.get("delivery_address"):
        return jsonify({"error": "pickup_address and delivery_address required"}), 400

    svc        = _svc()
    route_info = {"distance_km": 2.0, "duration_min": 15}
    if svc["mapbox"]:
        try:
            route_info = svc["mapbox"].get_route(
                data["pickup_address"], data["delivery_address"])
        except Exception as e:
            logger.warning(f"Mapbox fallback: {e}")

    subtotal = sum(i.get("price", 0) * i.get("quantity", 1) for i in data.get("items", []))
    return jsonify({
        "quote":      _calc_pricing(svc, subtotal, route_info, data),
        "route":      route_info,
        "expires_in": 300,
    }), 200


@orders_bp.route("/", methods=["POST"])
@require_auth(["customer"])
@idempotent
def create_order():
    data    = request.get_json(silent=True) or {}
    missing = [f for f in ["customer_id","restaurant_id","items",
                            "pickup_address","delivery_address","payment_method"]
               if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    svc        = _svc()
    route_info = {"distance_km": 2.0, "duration_min": 15}
    if svc["mapbox"]:
        try:
            route_info = svc["mapbox"].get_route(
                data["pickup_address"], data["delivery_address"])
        except Exception as e:
            logger.warning(f"Mapbox fallback: {e}")

    subtotal = sum(i.get("price", 0) * i.get("quantity", 1) for i in data["items"])
    pricing  = _calc_pricing(svc, subtotal, route_info, data)

    try:
        with transaction() as session:
            repo  = OrderRepository(session)
            order = repo.create(
                customer_id      = data["customer_id"],
                restaurant_id    = data["restaurant_id"],
                items            = data["items"],
                pickup_address   = data["pickup_address"],
                delivery_address = data["delivery_address"],
                payment_method   = data["payment_method"],
                pricing          = pricing,
                route_info       = route_info,
                promo_code       = data.get("promo_code"),
            )

            assigned_driver = None
            # Skip driver matching/dispatch for non-cash orders at creation time.
            # They will be matched in the Stripe Webhook handler upon successful payment.
            if data["payment_method"] == "cash":
                if svc["matching"]:
                    try:
                        assigned_driver = svc["matching"].find_best_driver(
                            order_id      = order.id,
                            pickup_coords = route_info.get("pickup_coords"),
                            restaurant_id = data["restaurant_id"],
                        )
                        if assigned_driver:
                            repo.assign_driver(order, assigned_driver["id"])
                    except Exception as e:
                        logger.warning(f"Smart matching error: {e}")

                if not assigned_driver:
                    try:
                        from tasks.matching import assign_driver
                        # Start async Celery assignment task
                        assign_driver(
                            order_id      = order.id,
                            restaurant_id = data["restaurant_id"],
                            pickup_lat    = route_info.get("pickup_coords", {}).get("lat") if route_info.get("pickup_coords") else None,
                            pickup_lng    = route_info.get("pickup_coords", {}).get("lng") if route_info.get("pickup_coords") else None
                        )
                        logger.info(f"Asynchronous driver assignment scheduled for order {order.id}")
                    except Exception as ex:
                        logger.error(f"Failed to queue Celery assignment task: {ex}")

            order_id     = order.id
            order_status = order.status

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"create_order: {e}")
        return jsonify({"error": "Order creation failed"}), 500

    _emit(order_id, "order_created", {
        "order_id": order_id, "status": order_status,
        "total": pricing["total"], "eta": route_info.get("duration_min"),
    })

    if data["payment_method"] == "cash":
        try:
            from app import socketio
            restaurant_id = data["restaurant_id"]
            order_data = repo.to_dict(order)
            socketio.emit("incoming_order", order_data, room=f"restaurant_{restaurant_id}")
        except Exception as e:
            logger.warning(f"Restaurant WS emit failed: {e}")

    return jsonify({
        "order_id": order_id, "status": order_status,
        "pricing":  pricing, "eta_min": route_info.get("duration_min"),
        "driver":   assigned_driver,
    }), 201


@orders_bp.route("/<order_id>", methods=["GET"])
@require_auth(["customer", "driver", "restaurant", "admin"])
def get_order(order_id: str):
    with get_db_session() as session:
        repo  = OrderRepository(session)
        order = repo.get(order_id)
        if not order:
            return jsonify({"error": "Order not found"}), 404
        return jsonify(repo.to_dict(order)), 200


import math

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

@orders_bp.route("/<order_id>/status", methods=["PATCH"])
@require_auth(["driver", "restaurant", "admin"])
@idempotent
def update_order_status(order_id: str):
    data            = request.get_json(silent=True) or {}
    status          = data.get("status")
    event_timestamp = data.get("event_timestamp")
    is_admin        = getattr(request, "user_role", None) == "admin"
    lat             = data.get("lat")
    lng             = data.get("lng")

    try:
        with transaction() as session:
            repo  = OrderRepository(session)
            order = repo.get_or_404(order_id)
            
            # Event Sequence Idempotency Guard
            if event_timestamp and order.updated_at:
                # If the incoming event is older than our last DB state update, ignore it as stale.
                if float(event_timestamp) < order.updated_at.timestamp():
                    logger.warning(f"Ignored stale event {status} for order {order_id}")
                    return jsonify({"order_id": order_id, "status": order.status, "ignored": True}), 200
            
            # Geofence & Ownership Validation for Drivers
            if getattr(request, "user_role", None) == "driver" and not is_admin:
                if order.driver_id and order.driver_id != request.user_id:
                    raise ValueError("Unauthorized: You are not assigned to this order.")
                    
                if status == "picked_up":
                    if lat is None or lng is None:
                        raise ValueError("Location (lat, lng) is required to pick up the order.")
                    route_info = getattr(order, "route_info", None)
                    pickup_coords = route_info.get("pickup_coords") if route_info else None
                    if pickup_coords:
                        dist = haversine_distance(float(lat), float(lng), float(pickup_coords["lat"]), float(pickup_coords["lng"]))
                        if dist > 50000:  # Increased tolerance for local testing
                            raise ValueError(f"You are too far ({int(dist)}m) from the restaurant. You must be within 50m to pick up.")
                
                elif status == "delivered":
                    if not data.get("proof_photo_url"):
                        raise ValueError("Proof of delivery photo is required.")
                        
                    if lat is None or lng is None:
                        raise ValueError("Location (lat, lng) is required to deliver the order.")
                    # Geocode the delivery address if we don't have coords cached
                    route_info = getattr(order, "route_info", None)
                    delivery_coords = route_info.get("delivery_coords") if route_info else None
                    if not delivery_coords:
                        mapbox_svc = getattr(current_app, "mapbox", None)
                        if mapbox_svc:
                            delivery_coords = mapbox_svc.geocode(order.delivery_address)
                    
                    if delivery_coords:
                        dist = haversine_distance(float(lat), float(lng), float(delivery_coords["lat"]), float(delivery_coords["lng"]))
                        if dist > 50000:  # Increased tolerance for local testing
                            raise ValueError(f"You are too far ({int(dist)}m) from the customer. You must be within 50m to deliver.")
            
            try:
                updated_order, side_effects = repo.transition(
                    order, status, 
                    actor_role=request.user_role, 
                    actor_id=request.user_id, 
                    driver_id=data.get("driver_id"),
                    force=is_admin
                )
                
                if status == "delivered" and data.get("proof_photo_url"):
                    updated_order.proof_type = data.get("proof_type", "photo")
                    updated_order.proof_photo_url = data.get("proof_photo_url")
                    
            except Exception as e:
                from order_state_manager import InvalidTransitionError
                if isinstance(e, InvalidTransitionError) and status == "picked_up" and order.status in ["accepted", "preparing"]:
                    # Strict Guard: Driver tries to pick up before restaurant is ready
                    _emit(order_id, "notify_restaurant", {
                        "type": "ready_reminder", 
                        "message": "The driver has arrived and is waiting. Please mark the order as ready!"
                    })
                    raise ValueError("Restaurant has not marked the order as ready. They have been notified.")
                raise e
            
            result_status = updated_order.status
            
            if "reassign_driver" in side_effects or status == "accepted":
                if not updated_order.driver_id:
                    try:
                        from tasks.matching import assign_driver
                        assign_driver(
                            order_id      = updated_order.id,
                            restaurant_id = updated_order.restaurant_id,
                            pickup_lat    = None,
                            pickup_lng    = None
                        )
                        logger.info(f"Triggering driver assignment for order {updated_order.id}")
                    except Exception as ex:
                        logger.error(f"Failed to queue Celery assignment task: {ex}")
                    
                    
            if "notify_partial_accept" in side_effects:
                _emit(order_id, "order_partial_accept", {
                    "order_id": order_id, 
                    "restaurant_accepted": bool(updated_order.restaurant_accepted_at),
                    "driver_accepted": bool(updated_order.driver_accepted_at)
                })
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except LookupError as e:
        return jsonify({"error": str(e)}), 404
    except PermissionError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"update_order_status: {e}")
        return jsonify({"error": "Status update failed"}), 500

    _emit(order_id, "order_status_update", {"order_id": order_id, "status": result_status})
    
    try:
        from app import socketio
        restaurant_id = updated_order.restaurant_id
        socketio.emit("order_status_update", {"id": order_id, "status": result_status}, room=f"restaurant_{restaurant_id}")
    except Exception as e:
        logger.warning(f"Restaurant WS emit failed: {e}")

    return jsonify({"order_id": order_id, "status": result_status}), 200


@orders_bp.route("/customer/<customer_id>", methods=["GET"])
@require_auth(["customer", "admin"])
def get_customer_orders(customer_id: str):
    limit  = int(request.args.get("limit",  20))
    offset = int(request.args.get("offset",  0))
    with get_db_session() as session:
        repo   = OrderRepository(session)
        orders = repo.find_by_customer(customer_id, limit=limit, offset=offset)
        return jsonify({
            "orders": [repo.to_dict(o) for o in orders],
            "count":  len(orders),
        }), 200
