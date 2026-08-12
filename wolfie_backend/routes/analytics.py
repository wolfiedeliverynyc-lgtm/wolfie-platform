"""
╔══════════════════════════════════════════════════════════════╗
║   WOLFIE DELIVERY — routes/analytics.py  (v4 — SQL agg.)    ║
╚══════════════════════════════════════════════════════════════╝
"""

import logging
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify
from routes.auth import require_auth
from database import get_db_session
from database.repositories import OrderRepository, UserRepository

analytics_bp = Blueprint("analytics", __name__)
logger       = logging.getLogger("wolfie")
UTC          = timezone.utc


@analytics_bp.route("/dashboard", methods=["GET"])
@require_auth(["admin"])
def dashboard():
    with get_db_session() as session:
        from database.schemas import User
        from sqlalchemy import select, func
        order_repo = OrderRepository(session)

        summary = order_repo.revenue_summary()
        
        # Count users by role using DB-level aggregation
        role_stmt = select(User.role, func.count(User.id)).group_by(User.role)
        role_counts = session.execute(role_stmt).all()
        by_role = {r: c for r, c in role_counts}
        
        # Count active users using DB-level aggregation
        active_stmt = select(func.count(User.id)).where(User.is_active == True)
        active_count = session.scalar(active_stmt) or 0
        
        total_users = sum(by_role.values())

        return jsonify({
            "orders":  summary,
            "users":   {"total": total_users, "by_role": by_role,
                        "active": active_count},
        }), 200


@analytics_bp.route("/orders/summary", methods=["GET"])
@require_auth(["admin"])
def orders_summary():
    days = int(request.args.get("days", 7))
    since = datetime.now(UTC) - timedelta(days=days)

    with get_db_session() as session:
        from database.schemas import Order
        from sqlalchemy import select
        
        # Query only the recent orders directly in SQL to prevent loading entire history
        stmt = select(Order).where(Order.created_at >= since).order_by(Order.created_at.asc())
        recent = list(session.scalars(stmt).all())

        delivered = [o for o in recent if o.status == "delivered"]
        cancelled = [o for o in recent if o.status == "cancelled"]
        gmv       = sum(o.total or 0 for o in delivered)

        daily = {}
        for o in recent:
            day = o.created_at.strftime("%Y-%m-%d")
            daily.setdefault(day, {"orders": 0, "revenue": 0.0})
            daily[day]["orders"] += 1
            if o.status == "delivered":
                daily[day]["revenue"] = round(daily[day]["revenue"] + (o.service_fee or 0), 2)

        # Performance SLA and transition time metrics
        matching_times = []
        prep_times = []
        transit_times = []
        total_times = []

        for o in recent:
            if o.driver_accepted_at and o.created_at:
                c_at = o.created_at.replace(tzinfo=UTC) if o.created_at.tzinfo is None else o.created_at.astimezone(UTC)
                d_acc = o.driver_accepted_at.replace(tzinfo=UTC) if o.driver_accepted_at.tzinfo is None else o.driver_accepted_at.astimezone(UTC)
                matching_times.append((d_acc - c_at).total_seconds())

            if o.picked_up_at and o.restaurant_accepted_at:
                r_acc = o.restaurant_accepted_at.replace(tzinfo=UTC) if o.restaurant_accepted_at.tzinfo is None else o.restaurant_accepted_at.astimezone(UTC)
                p_up = o.picked_up_at.replace(tzinfo=UTC) if o.picked_up_at.tzinfo is None else o.picked_up_at.astimezone(UTC)
                prep_times.append((p_up - r_acc).total_seconds())

            if o.delivered_at and o.picked_up_at:
                p_up = o.picked_up_at.replace(tzinfo=UTC) if o.picked_up_at.tzinfo is None else o.picked_up_at.astimezone(UTC)
                d_at = o.delivered_at.replace(tzinfo=UTC) if o.delivered_at.tzinfo is None else o.delivered_at.astimezone(UTC)
                transit_times.append((d_at - p_up).total_seconds())

            if o.status == "delivered" and o.delivered_at and o.created_at:
                c_at = o.created_at.replace(tzinfo=UTC) if o.created_at.tzinfo is None else o.created_at.astimezone(UTC)
                d_at = o.delivered_at.replace(tzinfo=UTC) if o.delivered_at.tzinfo is None else o.delivered_at.astimezone(UTC)
                total_times.append((d_at - c_at).total_seconds())

        avg_matching = round(sum(matching_times) / len(matching_times) / 60.0, 1) if matching_times else 0.0
        avg_prep = round(sum(prep_times) / len(prep_times) / 60.0, 1) if prep_times else 0.0
        avg_transit = round(sum(transit_times) / len(transit_times) / 60.0, 1) if transit_times else 0.0
        avg_total = round(sum(total_times) / len(total_times) / 60.0, 1) if total_times else 0.0

        return jsonify({
            "period_days":   days,
            "total_orders":  len(recent),
            "delivered":     len(delivered),
            "cancelled":     len(cancelled),
            "gmv":           round(gmv, 2),
            "platform_rev":  round(sum(o.service_fee or 0 for o in delivered), 2),
            "conversion":    round(len(delivered) / len(recent) * 100, 1) if recent else 0,
            "daily":         daily,
            "performance": {
                "avg_matching_min": avg_matching,
                "avg_prep_min": avg_prep,
                "avg_transit_min": avg_transit,
                "avg_delivery_total_min": avg_total
            }
        }), 200


@analytics_bp.route("/drivers/performance", methods=["GET"])
@require_auth(["admin"])
def drivers_performance():
    """
    Per-driver delivery and earnings stats.
    Previously: for d in drivers: find_by_driver(d.id) — N+1 queries.
    Now: one SQL GROUP BY across all drivers + one query to fetch driver info.
    """
    with get_db_session() as session:
        user_repo  = UserRepository(session)
        order_repo = OrderRepository(session)

        # Single SQL query: earnings + deliveries per driver
        perf_map = order_repo.get_all_drivers_performance()

        # Fetch only drivers that have at least one delivery, plus all active drivers
        drivers = user_repo.find_by_role("driver", limit=5000)

        result = []
        for d in drivers:
            perf = perf_map.get(d.id, {"total_deliveries": 0, "total_earnings": 0.0})
            result.append({
                "driver_id":        d.id,
                "name":             d.full_name,
                "total_deliveries": perf["total_deliveries"],
                "total_earnings":   perf["total_earnings"],
                "rating":           d.rating,
                "is_available":     d.is_available,
                "subscription":     d.subscription_status,
            })

        result.sort(key=lambda x: x["total_deliveries"], reverse=True)
        return jsonify({"drivers": result, "count": len(result)}), 200


@analytics_bp.route("/restaurants/performance", methods=["GET"])
@require_auth(["admin"])
def restaurants_performance():
    """
    Per-restaurant GMV and commission stats.
    Previously: for r in restaurants: find_by_restaurant(r.id, limit=10_000) — N+1 queries.
    Now: one SQL GROUP BY across all restaurants + one query to fetch restaurant info.
    """
    with get_db_session() as session:
        user_repo  = UserRepository(session)
        order_repo = OrderRepository(session)

        # Single SQL query: stats per restaurant_id
        perf_list = order_repo.get_all_restaurants_performance()
        perf_map  = {p["restaurant_id"]: p for p in perf_list}

        restaurants = user_repo.find_by_role("restaurant", limit=5000)

        result = []
        for r in restaurants:
            perf = perf_map.get(r.id, {"total_orders": 0, "delivered": 0, "gmv": 0.0, "commission": 0.0})
            result.append({
                "restaurant_id": r.id,
                "name":          r.restaurant_name or r.full_name,
                "total_orders":  perf["total_orders"],
                "delivered":     perf["delivered"],
                "gmv":           perf["gmv"],
                "commission":    perf["commission"],
                "rating":        r.rating,
                "is_open":       r.is_open,
            })

        result.sort(key=lambda x: x["gmv"], reverse=True)
        return jsonify({"restaurants": result, "count": len(result)}), 200
