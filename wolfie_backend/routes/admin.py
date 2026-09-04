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
    # Try Redis cache first (60s TTL)
    from flask import current_app
    import time
    redis = getattr(current_app, "redis", None)
    cache_key = "admin:dashboard:summary"
    if redis:
        cached = redis.cache.get(cache_key)
        if cached:
            return jsonify(cached), 200

    from sqlalchemy import func, select
    from database.schemas import User
    with get_db_session() as session:
        order_repo = OrderRepository(session)
        summary    = order_repo.revenue_summary()

        # SQL COUNT aggregation — no Python-side iteration over full objects
        role_counts = session.execute(
            select(User.role, func.count(User.id).label("cnt"))
            .group_by(User.role)
        ).all()
        total_count = session.execute(select(func.count(User.id))).scalar()
        active_count = session.execute(
            select(func.count(User.id)).where(User.is_active == True)
        ).scalar()

        by_role = {row.role: row.cnt for row in role_counts}

        result = {
            "orders": summary,
            "users": {
                "total":   total_count,
                "by_role": by_role,
                "active":  active_count,
            },
        }

        if redis:
            try:
                redis.cache.set(cache_key, result, ttl=60)
            except Exception:
                pass

        return jsonify(result), 200


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


@admin_bp.route("/restaurants/<restaurant_id>/menu", methods=["GET"])
def get_restaurant_admin_menu(restaurant_id):
    from database.schemas import MenuItem, User
    with get_db_session() as session:
        user = session.get(User, restaurant_id)
        items = session.query(MenuItem).filter_by(restaurant_id=restaurant_id).order_by(MenuItem.category).all()
        menu = [
            {c.name: getattr(i, c.name) for c in i.__table__.columns}
            for i in items
        ]
        docs = dict(getattr(user, "kyc_documents", None) or {}) if user else {}
        menu_doc = docs.get("menu_file") or docs.get("menu_pdf") or docs.get("menu_doc") or None
        return jsonify({
            "menu": menu,
            "items": menu,
            "count": len(menu),
            "menu_doc": menu_doc
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
            
            # Resolve zone dynamically from coordinates if available
            mapbox = getattr(current_app, "mapbox", None)
            if mapbox and lat is not None and lng is not None:
                try:
                    d_dict["zone"] = mapbox.resolve_zone(lat, lng)
                except Exception as e:
                    logger.warning(f"Failed to resolve zone for driver: {e}")
            else:
                d_dict["zone"] = getattr(d, "zone", None) or "Unknown Zone"

            driver_list.append(d_dict)
            
        return jsonify({
            "drivers": driver_list,
            "count":   len(drivers),
        }), 200


@admin_bp.route("/drivers/<driver_id>/declines", methods=["GET"])
def list_driver_declines(driver_id):
    limit  = int(request.args.get("limit", 50))
    offset = int(request.args.get("offset", 0))
    from database.schemas import DriverDeclineLog
    with get_db_session() as session:
        declines = session.query(DriverDeclineLog).filter_by(driver_id=driver_id).order_by(DriverDeclineLog.created_at.desc()).limit(limit).offset(offset).all()
        from sqlalchemy import func
        count = session.query(func.count(DriverDeclineLog.id)).filter_by(driver_id=driver_id).scalar()
        return jsonify({
            "declines": [{
                "id": d.id,
                "order_id": d.order_id,
                "created_at": d.created_at.isoformat()
            } for d in declines],
            "count": count,
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


@admin_bp.route("/metrics-summary", methods=["GET"])
@require_auth(roles=["admin"])
def metrics_summary():
    from services.metrics import (
        system_cpu, system_ram, system_disk, system_open_fds, system_uptime,
        redis_mem, redis_clients, redis_ping_latency, redis_queue_size,
        redis_hits, redis_misses,
        db_pool_size, db_pool_checked_out, db_pool_overflow,
        wolfie_orders_total, wolfie_driver_acceptances_total, wolfie_payment_total,
        wolfie_drivers_online, wolfie_orders_pending,
        dep_latency, matching_duration, payment_duration, dispatch_duration,
        ws_connections_active, ws_reconnections_total,
        update_system_metrics, update_redis_metrics
    )
    from flask import current_app
    from database import health_check

    def _val(gauge):
        try:
            return gauge._value.get()
        except Exception:
            return 0

    def _val_lbl(counter, label):
        try:
            return counter.labels(label)._value.get()
        except Exception:
            return 0

    def _hist_avg(metric, label):
        try:
            m = metric.labels(label)
            s = m._sum.get()
            c = m._count.get()
            return s / c if c > 0 else 0
        except Exception:
            return 0

    def _hist_avg_unlabeled(metric):
        try:
            s = metric._sum.get()
            c = metric._count.get()
            return s / c if c > 0 else 0
        except Exception:
            return 0

    # Update metrics
    update_system_metrics()
    redis_inst = getattr(current_app, "redis", None)
    update_redis_metrics(redis_inst)

    hits = _val(redis_hits)
    misses = _val(redis_misses)
    total_cache_ops = hits + misses
    hit_rate = (hits / total_cache_ops * 100) if total_cache_ops > 0 else 0.0

    return jsonify({
        "status": "success",
        "system": {
            "cpu_usage_percent": _val(system_cpu),
            "memory_usage_percent": _val(system_ram),
            "disk_usage_percent": _val(system_disk),
            "open_file_descriptors": _val(system_open_fds),
            "uptime_seconds": _val(system_uptime)
        },
        "redis": {
            "used_memory_bytes": _val(redis_mem),
            "connected_clients": _val(redis_clients),
            "latency_seconds": _val(redis_ping_latency),
            "queue_size": _val(redis_queue_size),
            "cache_hits": hits,
            "cache_misses": misses,
            "cache_hit_rate_percent": hit_rate
        },
        "database": {
            "pool_size": _val(db_pool_size),
            "pool_checked_out": _val(db_pool_checked_out),
            "pool_overflow": _val(db_pool_overflow),
            "latency_avg_seconds": _hist_avg(dep_latency, "db"),
            "health": health_check()
        },
        "business": {
            "orders": {
                "new": _val_lbl(wolfie_orders_total, "new"),
                "accepted": _val_lbl(wolfie_orders_total, "accepted"),
                "completed": _val_lbl(wolfie_orders_total, "completed"),
                "cancelled": _val_lbl(wolfie_orders_total, "cancelled")
            },
            "driver_acceptances": {
                "accepted": _val_lbl(wolfie_driver_acceptances_total, "accepted"),
                "rejected": _val_lbl(wolfie_driver_acceptances_total, "rejected"),
                "timeout": _val_lbl(wolfie_driver_acceptances_total, "timeout")
            },
            "payments": {
                "success": _val_lbl(wolfie_payment_total, "success"),
                "failed": _val_lbl(wolfie_payment_total, "failed"),
                "refunded": _val_lbl(wolfie_payment_total, "refunded")
            },
            "drivers_online": _val(wolfie_drivers_online),
            "orders_pending": _val(wolfie_orders_pending)
        },
        "latency": {
            "mapbox_avg_seconds": _hist_avg(dep_latency, "mapbox"),
            "stripe_avg_seconds": _hist_avg(dep_latency, "stripe"),
            "gemini_avg_seconds": _hist_avg(dep_latency, "gemini"),
            "matching_avg_seconds": _hist_avg_unlabeled(matching_duration),
            "payment_avg_seconds": _hist_avg_unlabeled(payment_duration),
            "dispatch_avg_seconds": _hist_avg_unlabeled(dispatch_duration)
        },
        "websocket": {
            "active_connections": _val(ws_connections_active),
            "reconnections_total": _val(ws_reconnections_total)
        }
    }), 200
