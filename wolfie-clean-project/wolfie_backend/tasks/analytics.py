"""
╔══════════════════════════════════════════════════════════════════════════════╗
║          WOLFIE DELIVERY — tasks/analytics.py                               ║
║          Metrics snapshots · Event tracking · Performance reports           ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import json
import logging
from datetime import datetime, timezone, timedelta
from celery_app import celery

logger = logging.getLogger("wolfie.tasks.analytics")
UTC    = timezone.utc

SNAPSHOT_KEY = "wolfie:analytics:snapshots"


# ══════════════════════════════════════════════════════════════════════════════
# METRICS SNAPSHOT  (Beat task — every 15 min)
# ══════════════════════════════════════════════════════════════════════════════

@celery.task(name="tasks.analytics.snapshot_metrics", queue="analytics")
def snapshot_metrics():
    """
    Beat task — every 15 min.
    Takes a lightweight snapshot of platform metrics and stores in Redis.
    Admin dashboard reads from this cache instead of running heavy DB queries.
    """
    from flask import current_app
    from database import get_session
    from database.repositories import OrderRepository, UserRepository
    from database.schemas import Order, User
    from sqlalchemy import select, func

    try:
        redis = getattr(current_app, "redis", None)

        with get_session() as session:
            # Order counts by status
            status_counts = {}
            result = session.execute(
                select(Order.status, func.count(Order.id).label("cnt"))
                .group_by(Order.status)
            ).all()
            for row in result:
                status_counts[row.status] = row.cnt

            # Revenue (delivered orders)
            revenue_row = session.execute(
                select(
                    func.count(Order.id).label("count"),
                    func.sum(Order.total).label("gmv"),
                    func.sum(Order.service_fee).label("platform_rev"),
                    func.avg(Order.total).label("avg_order"),
                ).where(Order.status == "delivered")
            ).first()

            # Active drivers
            active_drivers = session.scalar(
                select(func.count(User.id))
                .where(User.role == "driver", User.is_available == True, User.is_active == True)
            ) or 0

            # Users by role
            role_counts = {}
            result = session.execute(
                select(User.role, func.count(User.id))
                .where(User.is_active == True)
                .group_by(User.role)
            ).all()
            for row in result:
                role_counts[row[0]] = row[1]

        snapshot = {
            "timestamp":      datetime.now(UTC).isoformat(),
            "orders":         status_counts,
            "revenue": {
                "delivered_count": revenue_row.count or 0,
                "gmv":             round(float(revenue_row.gmv or 0), 2),
                "platform_rev":    round(float(revenue_row.platform_rev or 0), 2),
                "avg_order_value": round(float(revenue_row.avg_order or 0), 2),
            },
            "active_drivers": active_drivers,
            "users":          role_counts,
        }

        # Store in Redis with 20-min TTL
        if redis:
            redis.cache.set("analytics:snapshot", snapshot, ttl=1200)

        logger.info(f"Analytics snapshot taken ✅ — {status_counts}")
        return snapshot

    except Exception as e:
        logger.error(f"snapshot_metrics failed: {e}")
        raise


# ══════════════════════════════════════════════════════════════════════════════
# EVENT TRACKING
# ══════════════════════════════════════════════════════════════════════════════

@celery.task(name="tasks.analytics.track_event", queue="analytics")
def track_event(event_name: str, properties: dict = None, user_id: str = None):
    """
    Lightweight event tracking.
    Stores events in Redis list (last 1000) for real-time dashboard.
    """
    from flask import current_app

    event = {
        "event":      event_name,
        "properties": properties or {},
        "user_id":    user_id,
        "timestamp":  datetime.now(UTC).isoformat(),
    }

    redis = getattr(current_app, "redis", None)
    if redis:
        try:
            r = redis._manager.client(db=1)
            r.lpush("wolfie:events", json.dumps(event))
            r.ltrim("wolfie:events", 0, 999)   # keep last 1000 events
        except Exception as e:
            logger.warning(f"track_event Redis write failed: {e}")

    logger.debug(f"Event: {event_name} | user:{user_id}")
    return event


# ══════════════════════════════════════════════════════════════════════════════
# DRIVER PERFORMANCE REPORT  (weekly)
# ══════════════════════════════════════════════════════════════════════════════

@celery.task(name="tasks.analytics.weekly_driver_report", queue="analytics")
def weekly_driver_report():
    """
    Beat task — runs every Monday at 6am.
    Sends weekly earnings summary to each driver via SMS.
    """
    from database import get_session
    from database.repositories import UserRepository, OrderRepository
    from tasks.notify import send_sms

    week_ago = datetime.now(UTC) - timedelta(days=7)

    try:
        with get_session() as session:
            user_repo  = UserRepository(session)
            order_repo = OrderRepository(session)
            drivers    = user_repo.find_by_role("driver")

            for driver in drivers:
                orders    = order_repo.find_by_driver(driver.id, status="delivered")
                this_week = [
                    o for o in orders
                    if o.created_at and o.created_at.replace(tzinfo=UTC) >= week_ago
                ]
                if not this_week:
                    continue

                earnings = sum(o.driver_payout or 0 for o in this_week)
                send_sms.delay(
                    to   = driver.phone,
                    body = (
                        f"🐺 Wolfie Weekly Summary:\n"
                        f"Deliveries: {len(this_week)}\n"
                        f"Earnings: ${earnings:.2f}\n"
                        f"Keep it up!"
                    ),
                )

        logger.info("Weekly driver reports sent ✅")
        return {"status": "sent"}

    except Exception as e:
        logger.error(f"weekly_driver_report failed: {e}")
        raise


# ══════════════════════════════════════════════════════════════════════════════
# CONVENIENCE — fire-and-forget event helpers
# ══════════════════════════════════════════════════════════════════════════════

def track(event_name: str, properties: dict = None, user_id: str = None):
    """
    Call this from routes for async event tracking.

    Usage:
        from tasks.analytics import track
        track("order_created", {"total": 24.99, "restaurant": "rest_001"}, user_id=customer_id)
    """
    track_event.delay(event_name, properties or {}, user_id)
