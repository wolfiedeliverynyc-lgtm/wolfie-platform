"""
╔══════════════════════════════════════════════════════════════════════════════╗
║          WOLFIE DELIVERY — tasks/matching.py                                ║
║          Smart driver assignment + fallback + timeout handling              ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import logging
from datetime import datetime, timezone, timedelta
from celery_app import celery
from celery.exceptions import MaxRetriesExceededError

logger = logging.getLogger("wolfie.tasks.matching")
UTC    = timezone.utc

# How long to keep trying before cancelling the order
MAX_MATCHING_ATTEMPTS = 5
RETRY_DELAY_SECONDS   = 60   # try again every 1 min


# ══════════════════════════════════════════════════════════════════════════════
# MAIN MATCHING TASK
# ══════════════════════════════════════════════════════════════════════════════

@celery.task(
    name        = "tasks.matching.assign_driver",
    queue       = "matching",
    bind        = True,
    max_retries = MAX_MATCHING_ATTEMPTS,
    default_retry_delay = RETRY_DELAY_SECONDS,
)
def assign_driver(self, order_id: str, restaurant_id: str,
                  pickup_lat: float = None, pickup_lng: float = None):
    """
    Attempts to assign the best available driver to an order.
    Retries every 60s for up to 5 minutes before cancelling.
    """
    from flask import current_app
    from database import transaction
    from database.repositories import OrderRepository, UserRepository
    from database.repositories.rating import DriverLocationRepository

    logger.info(f"Matching attempt {self.request.retries + 1}/{MAX_MATCHING_ATTEMPTS} for order {order_id}")

    try:
        with transaction() as session:
            order_repo = OrderRepository(session)
            order      = order_repo.get(order_id)

            if not order:
                logger.error(f"Order {order_id} not found — aborting matching")
                return {"status": "aborted", "reason": "order_not_found"}

            if order.status not in ("pending", "assigned"):
                logger.info(f"Order {order_id} already {order.status} — skipping matching")
                return {"status": "skipped", "reason": f"order_is_{order.status}"}

            # ── Find best driver ──────────────────────
            svc          = getattr(current_app, "matching", None)
            redis_svc    = getattr(current_app, "redis",    None)
            best_driver  = None

            if svc:
                try:
                    best_driver = svc.find_best_driver(
                        order_id      = order_id,
                        pickup_coords = (pickup_lat, pickup_lng) if pickup_lat else None,
                        restaurant_id = restaurant_id,
                    )
                except Exception as e:
                    logger.warning(f"Matching engine error: {e} — falling back to proximity")

            # Fallback: nearest online driver from Redis location cache
            if not best_driver and redis_svc and pickup_lat:
                online = redis_svc.locations.get_all_online()
                best_driver = _nearest_driver(online, pickup_lat, pickup_lng, session)

            # Last resort: any available driver
            if not best_driver:
                user_repo   = UserRepository(session)
                available   = user_repo.find_available_drivers()
                if available:
                    best_driver = {"id": available[0].id, "phone": available[0].phone,
                                   "name": available[0].full_name}

            if not best_driver:
                # No driver found — retry later
                logger.warning(f"No driver for order {order_id} — retry {self.request.retries + 1}")
                try:
                    raise self.retry(countdown=RETRY_DELAY_SECONDS)
                except MaxRetriesExceededError:
                    return _handle_no_driver(order_id, order, session, order_repo)

            # ── Assign driver ─────────────────────────
            order_repo.assign_driver(order, best_driver["id"])

            # Notify driver
            from tasks.notify import notify_driver
            notify_driver.delay(
                order_id     = order_id,
                driver_phone = best_driver.get("phone", ""),
                event        = "assigned",
            )

            # Notify customer
            user_repo = UserRepository(session)
            customer  = user_repo.get(order.customer_id)
            if customer:
                from tasks.notify import driver_assigned
                driver_assigned.delay(
                    order_id       = order_id,
                    customer_phone = customer.phone,
                    driver_name    = best_driver.get("name", "Your driver"),
                    eta_min        = order.eta_minutes or 25,
                )

            logger.info(f"Driver {best_driver['id']} assigned to order {order_id} ✅")
            return {"status": "assigned", "driver_id": best_driver["id"]}

    except self.MaxRetriesExceededError:
        raise
    except Exception as e:
        logger.error(f"assign_driver task error [{order_id}]: {e}")
        try:
            raise self.retry(exc=e, countdown=RETRY_DELAY_SECONDS)
        except MaxRetriesExceededError:
            logger.error(f"Matching permanently failed for order {order_id}")
            return {"status": "failed", "error": str(e)}


# ══════════════════════════════════════════════════════════════════════════════
# DRIVER UNASSIGNMENT  (driver cancels / goes offline)
# ══════════════════════════════════════════════════════════════════════════════

@celery.task(name="tasks.matching.reassign_driver", queue="matching")
def reassign_driver(order_id: str, previous_driver_id: str):
    """
    Driver dropped the order — find a replacement immediately.
    Adds penalty note to previous driver.
    """
    logger.info(f"Reassigning order {order_id} (previous driver: {previous_driver_id})")

    from database import transaction
    from database.repositories import OrderRepository, UserRepository

    try:
        with transaction() as session:
            order_repo = OrderRepository(session)
            order      = order_repo.get(order_id)
            if not order:
                return

            # Reset to pending so matching can retry
            order_repo.update(order, status="pending", driver_id=None)

            # Record drop on driver profile
            user_repo = UserRepository(session)
            driver    = user_repo.get(previous_driver_id)
            if driver:
                drops = (driver.total_deliveries or 0) - 1   # placeholder logic
                user_repo.update(driver, rating_warning=True)

        # Trigger fresh matching
        assign_driver.apply_async(
            args   = [order_id, order.restaurant_id],
            kwargs = {},
            countdown = 5,
        )
        logger.info(f"Reassignment triggered for order {order_id}")

    except Exception as e:
        logger.error(f"reassign_driver failed [{order_id}]: {e}")
        raise


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _nearest_driver(online_locations: dict, pickup_lat: float, pickup_lng: float,
                    session) -> dict | None:
    """Find nearest online driver using Euclidean distance (fast approximation)."""
    if not online_locations:
        return None

    from database.repositories import UserRepository
    user_repo = UserRepository(session)
    best      = None
    best_dist = float("inf")

    for driver_id, loc in online_locations.items():
        dist = ((loc["lat"] - pickup_lat) ** 2 + (loc["lng"] - pickup_lng) ** 2) ** 0.5
        if dist < best_dist:
            driver = user_repo.get(driver_id)
            if driver and driver.is_available and driver.is_active:
                best_dist = dist
                best      = {"id": driver_id, "phone": driver.phone,
                             "name": driver.full_name, "dist": dist}
    return best


def _handle_no_driver(order_id, order, session, order_repo) -> dict:
    """Called when all retries exhausted — cancel the order."""
    logger.error(f"No driver found after {MAX_MATCHING_ATTEMPTS} attempts — cancelling {order_id}")

    from database.repositories import UserRepository
    order_repo.cancel(order, actor_role="system", actor_id="auto",
                      reason="No driver available after multiple attempts")

    user_repo = UserRepository(session)
    customer  = user_repo.get(order.customer_id)
    if customer:
        from tasks.notify import order_cancelled
        order_cancelled.delay(
            order_id       = order_id,
            customer_phone = customer.phone,
            reason         = "No driver available in your area",
        )

    return {"status": "cancelled", "reason": "no_driver_available"}
