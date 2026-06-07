"""
╔══════════════════════════════════════════════════════════════╗
║   WOLFIE DELIVERY — routes/restaurants.py  (v3 — Repos)     ║
╚══════════════════════════════════════════════════════════════╝
"""

import uuid, logging
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from routes.auth import require_auth
from database import transaction, get_db_session
from database.repositories import OrderRepository, UserRepository
from database.schemas import MenuItem

restaurants_bp = Blueprint("restaurants", __name__)
logger         = logging.getLogger("wolfie")
UTC            = timezone.utc


def _emit(order_id, event, data):
    try:
        from app import socketio
        socketio.emit(event, data, room=f"order_{order_id}")
    except Exception:
        pass


@restaurants_bp.route("/orders", methods=["GET"])
@require_auth(["restaurant", "admin"])
def restaurant_orders():
    status = request.args.get("status")
    limit  = int(request.args.get("limit", 20))
    with get_db_session() as session:
        repo   = OrderRepository(session)
        orders = repo.find_by_restaurant(request.user_id, limit=limit)
        if status:
            orders = [o for o in orders if o.status == status]
        return jsonify({
            "orders": [repo.to_dict(o) for o in orders],
            "count":  len(orders),
        }), 200


@restaurants_bp.route("/orders/<order_id>/accept", methods=["POST"])
@require_auth(["restaurant"])
def accept_order(order_id):
    try:
        with transaction() as session:
            repo  = OrderRepository(session)
            order = repo.get_or_404(order_id)
            repo.transition(order, "accepted", actor_role=request.user_role, actor_id=request.user_id)
    except (ValueError, PermissionError) as e:
        return jsonify({"error": str(e)}), 400
    except LookupError as e:
        return jsonify({"error": str(e)}), 404

    _emit(order_id, "order_status_update", {"order_id": order_id, "status": "accepted"})
    return jsonify({"order_id": order_id, "status": "accepted"}), 200


@restaurants_bp.route("/orders/<order_id>/ready", methods=["POST"])
@require_auth(["restaurant"])
def mark_order_ready(order_id):
    try:
        with transaction() as session:
            repo  = OrderRepository(session)
            order = repo.get_or_404(order_id)
            repo.transition(order, "ready", actor_role=request.user_role, actor_id=request.user_id)
    except (ValueError, PermissionError) as e:
        return jsonify({"error": str(e)}), 400
    except LookupError as e:
        return jsonify({"error": str(e)}), 404

    _emit(order_id, "order_status_update", {"order_id": order_id, "status": "ready"})
    return jsonify({"order_id": order_id, "status": "ready"}), 200


@restaurants_bp.route("/toggle-open", methods=["PATCH"])
@require_auth(["restaurant"])
def toggle_open():
    data    = request.get_json(silent=True) or {}
    is_open = data.get("is_open")
    if is_open is None:
        return jsonify({"error": "is_open required"}), 400

    with transaction() as session:
        repo = UserRepository(session)
        user = repo.get_or_404(request.user_id)
        repo.update(user, is_open=bool(is_open))

    return jsonify({"is_open": bool(is_open)}), 200


@restaurants_bp.route("/menu", methods=["GET"])
@require_auth(["restaurant", "customer"])
def get_menu():
    restaurant_id = request.args.get("restaurant_id") or request.user_id
    with get_db_session() as session:
        items = session.query(MenuItem) \
            .filter_by(restaurant_id=restaurant_id, is_available=True) \
            .order_by(MenuItem.category).all()
        menu = [
            {c.name: getattr(i, c.name) for c in i.__table__.columns}
            for i in items
        ]
        return jsonify({"menu": menu, "count": len(menu)}), 200


@restaurants_bp.route("/menu", methods=["POST"])
@require_auth(["restaurant"])
def add_menu_item():
    data = request.get_json(silent=True) or {}
    for f in ["name", "price", "category"]:
        if not data.get(f):
            return jsonify({"error": f"Missing field: {f}"}), 400
    if float(data["price"]) <= 0:
        return jsonify({"error": "Price must be greater than 0"}), 400

    try:
        with transaction() as session:
            now  = datetime.now(UTC)
            item = MenuItem(
                id            = str(uuid.uuid4()),
                restaurant_id = request.user_id,
                name          = data["name"].strip(),
                description   = data.get("description", ""),
                price         = float(data["price"]),
                category      = data["category"].strip(),
                image_url     = data.get("image_url"),
                is_available  = data.get("is_available", True),
                created_at    = now,
                updated_at    = now,
            )
            session.add(item)
            item_id = item.id
    except Exception as e:
        logger.error(f"add_menu_item: {e}")
        return jsonify({"error": "Failed to add item"}), 500

    return jsonify({"id": item_id, "message": "Item added"}), 201


@restaurants_bp.route("/menu/<item_id>", methods=["PATCH"])
@require_auth(["restaurant"])
def update_menu_item(item_id):
    data = request.get_json(silent=True) or {}
    if "price" in data and float(data["price"]) <= 0:
        return jsonify({"error": "Price must be greater than 0"}), 400

    with transaction() as session:
        item = session.get(MenuItem, item_id)
        if not item or item.restaurant_id != request.user_id:
            return jsonify({"error": "Item not found"}), 404
        for field in ["name","description","price","category","image_url","is_available"]:
            if field in data:
                setattr(item, field, data[field])
        item.updated_at = datetime.now(UTC)

    return jsonify({"message": "Item updated"}), 200


@restaurants_bp.route("/menu/<item_id>", methods=["DELETE"])
@require_auth(["restaurant"])
def delete_menu_item(item_id):
    with transaction() as session:
        item = session.get(MenuItem, item_id)
        if not item or item.restaurant_id != request.user_id:
            return jsonify({"error": "Item not found"}), 404
        session.delete(item)
    return jsonify({"message": "Item deleted"}), 200


@restaurants_bp.route("/stats", methods=["GET"])
@require_auth(["restaurant"])
def restaurant_stats():
    with get_db_session() as session:
        repo   = OrderRepository(session)
        orders = repo.find_by_restaurant(request.user_id, limit=10_000)
        delivered  = [o for o in orders if o.status == "delivered"]
        gmv        = sum(o.total or 0 for o in delivered)
        commission = sum(o.restaurant_commission or 0 for o in delivered)
        return jsonify({
            "restaurant_id":    request.user_id,
            "total_orders":     len(orders),
            "delivered_orders": len(delivered),
            "gmv":              round(gmv, 2),
            "commission_paid":  round(commission, 2),
            "net_revenue":      round(gmv - commission, 2),
        }), 200


@restaurants_bp.route("/hours", methods=["GET"])
@require_auth(["restaurant"])
def get_operating_hours():
    with get_db_session() as session:
        repo = UserRepository(session)
        user = repo.get_or_404(request.user_id)
        return jsonify({
            "operating_hours": user.operating_hours or {},
            "busy_mode": user.busy_mode or False
        }), 200


@restaurants_bp.route("/hours", methods=["PATCH"])
@require_auth(["restaurant"])
def update_operating_hours():
    data = request.get_json(silent=True) or {}
    hours = data.get("operating_hours")
    if hours is None:
        return jsonify({"error": "operating_hours required"}), 400

    with transaction() as session:
        repo = UserRepository(session)
        user = repo.get_or_404(request.user_id)
        user.operating_hours = hours

    return jsonify({"message": "Operating hours updated", "operating_hours": hours}), 200


@restaurants_bp.route("/busy-mode", methods=["POST"])
@require_auth(["restaurant"])
def toggle_busy_mode():
    data = request.get_json(silent=True) or {}
    busy = data.get("busy_mode")
    if busy is None:
        return jsonify({"error": "busy_mode required"}), 400

    with transaction() as session:
        repo = UserRepository(session)
        user = repo.get_or_404(request.user_id)
        user.busy_mode = bool(busy)

    return jsonify({"message": "Busy mode updated", "busy_mode": bool(busy)}), 200


@restaurants_bp.route("/zones", methods=["GET"])
@require_auth(["restaurant", "customer", "admin"])
def get_delivery_zones():
    rest_id = request.args.get("restaurant_id") or request.user_id
    with get_db_session() as session:
        repo = UserRepository(session)
        user = repo.get_or_404(rest_id)
        return jsonify({"delivery_zones": user.delivery_zones or []}), 200


@restaurants_bp.route("/zones", methods=["POST"])
@require_auth(["restaurant"])
def save_delivery_zones():
    data = request.get_json(silent=True) or {}
    zones = data.get("delivery_zones")
    if zones is None:
        return jsonify({"error": "delivery_zones required"}), 400

    with transaction() as session:
        repo = UserRepository(session)
        user = repo.get_or_404(request.user_id)
        user.delivery_zones = zones

    return jsonify({"message": "Delivery zones updated", "delivery_zones": zones}), 200


@restaurants_bp.route("/", methods=["GET"])
@require_auth(["customer", "restaurant", "admin"])
def list_restaurants():
    with get_db_session() as session:
        users = session.query(UserRepository.model).filter_by(role="restaurant", is_active=True).all()
        res = []
        for u in users:
            res.append({
                "id": u.id,
                "restaurant_name": u.restaurant_name,
                "is_open": u.is_open,
                "chef_name": u.chef_name,
                "chef_bio": u.chef_bio,
                "chef_image": u.chef_image,
                "story": u.story,
                "bio": u.bio,
                "hero_image": u.hero_image,
                "logo_image": u.logo_image,
                "address": u.address,
                "latitude": u.latitude,
                "longitude": u.longitude,
                "category": u.category,
                "price_level": u.price_level,
                "delivery_time_min": u.delivery_time_min,
                "delivery_fee": u.delivery_fee,
                "busy_mode": u.busy_mode,
            })
        return jsonify({"restaurants": res, "count": len(res)}), 200


@restaurants_bp.route("/<restaurant_id>", methods=["GET"])
@require_auth(["customer", "restaurant", "admin"])
def get_restaurant_detail(restaurant_id):
    with get_db_session() as session:
        repo = UserRepository(session)
        u = repo.find_active(restaurant_id)
        if not u or u.role != "restaurant":
            return jsonify({"error": "Restaurant not found"}), 404
        
        return jsonify({
            "id": u.id,
            "restaurant_name": u.restaurant_name,
            "is_open": u.is_open,
            "chef_name": u.chef_name,
            "chef_bio": u.chef_bio,
            "chef_image": u.chef_image,
            "story": u.story,
            "bio": u.bio,
            "hero_image": u.hero_image,
            "logo_image": u.logo_image,
            "address": u.address,
            "latitude": u.latitude,
            "longitude": u.longitude,
            "category": u.category,
            "price_level": u.price_level,
            "delivery_time_min": u.delivery_time_min,
            "delivery_fee": u.delivery_fee,
            "busy_mode": u.busy_mode,
        }), 200


@restaurants_bp.route("/profile", methods=["PATCH"])
@require_auth(["restaurant"])
def update_profile():
    data = request.get_json(silent=True) or {}
    
    allowed_fields = [
        "restaurant_name", "chef_name", "chef_bio", "chef_image", "story",
        "bio", "hero_image", "logo_image", "address", "latitude", "longitude",
        "category", "price_level", "delivery_time_min", "delivery_fee"
    ]
    
    update_data = {}
    for f in allowed_fields:
        if f in data:
            val = data[f]
            if isinstance(val, str):
                val = val.strip()
            if f in ["latitude", "longitude"] and val is not None:
                val = float(val)
            if f == "delivery_time_min" and val is not None:
                val = int(val)
            if f == "delivery_fee" and val is not None:
                val = float(val)
            update_data[f] = val

    if not update_data:
        return jsonify({"error": "No update fields provided"}), 400

    try:
        with transaction() as session:
            repo = UserRepository(session)
            user = repo.get_or_404(request.user_id)
            repo.update(user, **update_data)
    except Exception as e:
        logger.error(f"update_profile: {e}")
        return jsonify({"error": "Failed to update profile"}), 500

    return jsonify({"message": "Profile updated successfully"}), 200


