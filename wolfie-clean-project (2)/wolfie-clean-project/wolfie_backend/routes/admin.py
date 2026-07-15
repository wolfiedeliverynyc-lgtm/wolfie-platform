"""
╔══════════════════════════════════════════════════════════════╗
║   WOLFIE DELIVERY — routes/admin.py                         ║
╚══════════════════════════════════════════════════════════════╝
"""

import logging
from flask import Blueprint, request, jsonify
from routes.auth import require_auth
from database import transaction, get_db_session
from database.repositories import OrderRepository, UserRepository
from services.audit_logger import log_admin_action

admin_bp = Blueprint("admin", __name__)
logger   = logging.getLogger("wolfie")


@admin_bp.route("/dashboard", methods=["GET"])
def dashboard():
    with get_db_session() as session:
        order_repo = OrderRepository(session)
        user_repo  = UserRepository(session)
        summary    = order_repo.revenue_summary()
        users      = user_repo.list(limit=10_000)
        by_role    = {}
        for u in users:
            by_role[u.role] = by_role.get(u.role, 0) + 1
        return jsonify({
            "orders": summary,
            "users":  {
                "total":   len(users),
                "by_role": by_role,
                "active":  len([u for u in users if u.is_active]),
            },
        }), 200


@admin_bp.route("/users", methods=["GET"])
def list_users():
    role   = request.args.get("role")
    limit  = int(request.args.get("limit",  50))
    offset = int(request.args.get("offset",  0))
    with get_db_session() as session:
        repo  = UserRepository(session)
        users = repo.find_by_role(role, limit, offset) if role \
                else repo.list(limit=limit, offset=offset)
        return jsonify({
            "users": [repo.safe_dict(u) for u in users],
            "count": len(users),
        }), 200


@admin_bp.route("/users/<user_id>", methods=["GET"])
def get_user(user_id):
    with get_db_session() as session:
        repo = UserRepository(session)
        user = repo.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify(repo.safe_dict(user)), 200


@admin_bp.route("/users/<user_id>/activate", methods=["PATCH"])
def activate_user(user_id):
    data      = request.get_json(silent=True) or {}
    is_active = data.get("is_active")
    if is_active is None:
        return jsonify({"error": "is_active (true/false) required"}), 400
    try:
        with transaction() as session:
            repo = UserRepository(session)
            user = repo.get_or_404(user_id)
            repo.set_active(user, bool(is_active))
            
            action = "activated" if is_active else "suspended"
            log_admin_action(
                session, actor_id=request.user_id, actor_role=request.user_role,
                action=action, target_type="user", target_id=user_id
            )
    except LookupError as e:
        return jsonify({"error": str(e)}), 404

    logger.info(f"Admin {request.user_id} {action} user {user_id}")
    return jsonify({"user_id": user_id, "is_active": bool(is_active), "action": action}), 200


@admin_bp.route("/users/<user_id>/role", methods=["PATCH"])
def change_user_role(user_id):
    data = request.get_json(silent=True) or {}
    role = data.get("role", "")
    try:
        with transaction() as session:
            repo = UserRepository(session)
            user = repo.get_or_404(user_id)
            repo.set_role(user, role)
            
            log_admin_action(
                session, actor_id=request.user_id, actor_role=request.user_role,
                action="change_role", target_type="user", target_id=user_id,
                metadata={"new_role": role}
            )
    except (LookupError, ValueError) as e:
        return jsonify({"error": str(e)}), 400
    logger.info(f"Admin {request.user_id} changed {user_id} → {role}")
    return jsonify({"user_id": user_id, "new_role": role}), 200


@admin_bp.route("/restaurants", methods=["GET"])
def list_restaurants():
    with get_db_session() as session:
        repo  = UserRepository(session)
        rests = repo.find_by_role("restaurant")
        return jsonify({
            "restaurants": [repo.safe_dict(r) for r in rests],
            "count":       len(rests),
        }), 200


@admin_bp.route("/restaurants/<restaurant_id>/commission", methods=["PATCH"])
def set_commission(restaurant_id):
    data = request.get_json(silent=True) or {}
    commission = float(data.get("commission_rate", 0))
    try:
        with transaction() as session:
            repo = UserRepository(session)
            user = repo.get_or_404(restaurant_id)
            repo.set_commission(user, commission)
            
            log_admin_action(
                session, actor_id=request.user_id, actor_role=request.user_role,
                action="set_commission", target_type="restaurant", target_id=restaurant_id,
                metadata={"commission_rate": commission}
            )
    except (LookupError, ValueError) as e:
        return jsonify({"error": str(e)}), 400
    return jsonify({"restaurant_id": restaurant_id,
                    "commission_rate": commission}), 200


@admin_bp.route("/restaurants/<restaurant_id>/suspend", methods=["PATCH"])
def suspend_restaurant(restaurant_id):
    data = request.get_json(silent=True) or {}
    reason = data.get("reason", "")
    with transaction() as session:
        repo = UserRepository(session)
        user = repo.get_or_404(restaurant_id)
        repo.update(user, is_active=False, is_open=False,
                    suspension_reason=reason)
                    
        log_admin_action(
            session, actor_id=request.user_id, actor_role=request.user_role,
            action="suspend", target_type="restaurant", target_id=restaurant_id,
            metadata={"reason": reason}
        )
    return jsonify({"restaurant_id": restaurant_id, "status": "suspended"}), 200


@admin_bp.route("/drivers", methods=["GET"])
def list_drivers():
    from database.repositories.rating import DriverLocationRepository
    from flask import current_app
    redis = getattr(current_app, "redis", None)
    with get_db_session() as session:
        repo     = UserRepository(session)
        loc_repo = DriverLocationRepository(session)
        drivers  = repo.find_by_role("driver")
        
        driver_list = []
        for d in drivers:
            d_dict = repo.safe_dict(d)
            lat, lng = None, None
            
            # 1. Try Redis cache
            if redis:
                try:
                    last_loc = redis.locations.get(d.id)
                    if last_loc:
                        lat = last_loc.get("lat")
                        lng = last_loc.get("lng")
                except Exception as e:
                    logger.warning(f"Error fetching location from redis for {d.id}: {e}")
            
            # 2. Try DB table
            if lat is None or lng is None:
                try:
                    loc = loc_repo.get_for_driver(d.id)
                    if loc:
                        lat = loc.lat
                        lng = loc.lng
                except Exception as e:
                    logger.warning(f"Error fetching location from DB for {d.id}: {e}")
            
            d_dict["lat"] = lat
            d_dict["lng"] = lng
            driver_list.append(d_dict)
            
        return jsonify({
            "drivers": driver_list,
            "count":   len(drivers),
        }), 200


@admin_bp.route("/drivers/<driver_id>/declines", methods=["GET"])
def list_driver_declines(driver_id):
    from database.schemas import DriverDeclineLog
    with get_db_session() as session:
        declines = session.query(DriverDeclineLog).filter_by(driver_id=driver_id).order_by(DriverDeclineLog.created_at.desc()).all()
        return jsonify({
            "declines": [{
                "id": d.id,
                "order_id": d.order_id,
                "created_at": d.created_at.isoformat()
            } for d in declines],
            "count": len(declines),
        }), 200


@admin_bp.route("/drivers/<driver_id>/approve", methods=["PATCH"])
def approve_driver(driver_id):
    with transaction() as session:
        repo = UserRepository(session)
        user = repo.get_or_404(driver_id)
        repo.update(user, is_active=True, subscription_status="active")
        
        log_admin_action(
            session, actor_id=request.user_id, actor_role=request.user_role,
            action="approve", target_type="driver", target_id=driver_id
        )
    logger.info(f"Admin {request.user_id} approved driver {driver_id}")
    return jsonify({"driver_id": driver_id, "status": "approved"}), 200


@admin_bp.route("/revenue", methods=["GET"])
def revenue_summary():
    with get_db_session() as session:
        repo = OrderRepository(session)
        return jsonify(repo.revenue_summary()), 200
