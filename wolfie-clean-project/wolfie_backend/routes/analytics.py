"""
╔══════════════════════════════════════════════════════════════╗
║   WOLFIE DELIVERY — routes/analytics.py  (v3 — Repos)       ║
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
        order_repo = OrderRepository(session)
        user_repo  = UserRepository(session)

        summary = order_repo.revenue_summary()
        users   = user_repo.list(limit=100_000)
        by_role = {}
        for u in users:
            by_role[u.role] = by_role.get(u.role, 0) + 1

        return jsonify({
            "orders":  summary,
            "users":   {"total": len(users), "by_role": by_role,
                        "active": len([u for u in users if u.is_active])},
        }), 200


@analytics_bp.route("/orders/summary", methods=["GET"])
@require_auth(["admin"])
def orders_summary():
    days = int(request.args.get("days", 7))
    since = datetime.now(UTC) - timedelta(days=days)

    with get_db_session() as session:
        repo   = OrderRepository(session)
        orders = repo.list(limit=100_000, order_by="created_at")
        recent = [o for o in orders if o.created_at and o.created_at.replace(tzinfo=UTC) >= since]

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

        return jsonify({
            "period_days":   days,
            "total_orders":  len(recent),
            "delivered":     len(delivered),
            "cancelled":     len(cancelled),
            "gmv":           round(gmv, 2),
            "platform_rev":  round(sum(o.service_fee or 0 for o in delivered), 2),
            "conversion":    round(len(delivered) / len(recent) * 100, 1) if recent else 0,
            "daily":         daily,
        }), 200


@analytics_bp.route("/drivers/performance", methods=["GET"])
@require_auth(["admin"])
def drivers_performance():
    with get_db_session() as session:
        user_repo  = UserRepository(session)
        order_repo = OrderRepository(session)

        drivers = user_repo.find_by_role("driver")
        result  = []
        for d in drivers:
            orders    = order_repo.find_by_driver(d.id, status="delivered")
            earnings  = sum(o.driver_payout or 0 for o in orders)
            result.append({
                "driver_id":        d.id,
                "name":             d.full_name,
                "total_deliveries": len(orders),
                "total_earnings":   round(earnings, 2),
                "rating":           d.rating,
                "is_available":     d.is_available,
                "subscription":     d.subscription_status,
            })

        result.sort(key=lambda x: x["total_deliveries"], reverse=True)
        return jsonify({"drivers": result, "count": len(result)}), 200


@analytics_bp.route("/restaurants/performance", methods=["GET"])
@require_auth(["admin"])
def restaurants_performance():
    with get_db_session() as session:
        user_repo  = UserRepository(session)
        order_repo = OrderRepository(session)

        restaurants = user_repo.find_by_role("restaurant")
        result      = []
        for r in restaurants:
            orders    = order_repo.find_by_restaurant(r.id, limit=10_000)
            delivered = [o for o in orders if o.status == "delivered"]
            gmv       = sum(o.total or 0 for o in delivered)
            commission= sum(o.restaurant_commission or 0 for o in delivered)
            result.append({
                "restaurant_id":  r.id,
                "name":           r.restaurant_name or r.full_name,
                "total_orders":   len(orders),
                "delivered":      len(delivered),
                "gmv":            round(gmv, 2),
                "commission":     round(commission, 2),
                "rating":         r.rating,
                "is_open":        r.is_open,
            })

        result.sort(key=lambda x: x["gmv"], reverse=True)
        return jsonify({"restaurants": result, "count": len(result)}), 200
