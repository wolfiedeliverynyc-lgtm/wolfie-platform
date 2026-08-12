"""
╔══════════════════════════════════════════════════════════════════════════════╗
║          WOLFIE DELIVERY — tasks/matching.py                                ║
║          Smart driver assignment + fallback + timeout handling              ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import logging
import time
from datetime import datetime, timezone, timedelta
from celery_app import celery
from celery.exceptions import MaxRetriesExceededError

logger = logging.getLogger("wolfie.tasks.matching")
UTC    = timezone.utc

# How long to keep trying before cancelling the order
MAX_MATCHING_ATTEMPTS = 5
RETRY_DELAY_SECONDS   = 20   # try again every 20 sec


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
    Retries every 20s for up to MAX_MATCHING_ATTEMPTS before cancelling.

    Race Condition Protection:
    - The Order row is locked with SELECT FOR UPDATE at the start of each
      attempt. This prevents two concurrent Celery workers from assigning
      different drivers to the same order simultaneously.
    - The Driver row is also locked with FOR UPDATE inside assign_driver()
      in the repository to prevent double-booking.
    """
    from flask import current_app
    from database import transaction
    from database.repositories import OrderRepository, UserRepository
    from database.repositories.rating import DriverLocationRepository
    from sqlalchemy import select
    from database.schemas import Order as OrderModel

    attempt = self.request.retries + 1
    logger.info(f"[Dispatch] Matching attempt {attempt}/{MAX_MATCHING_ATTEMPTS} for order {order_id}")
    t_start = time.monotonic()

    try:
        with transaction() as session:
            # ── RACE CONDITION GUARD ──────────────────────────────────────────
            # Lock the order row immediately. On PostgreSQL this prevents a
            # second concurrent worker from reading the same order as 'pending'
            # and assigning a different driver at the same time.
            # On SQLite (testing) WITH FOR UPDATE is a no-op — safe to ignore.
            try:
                order = session.scalar(
                    select(OrderModel)
                    .where(OrderModel.id == order_id)
                    .with_for_update()
                )
            except Exception:
                # SQLite doesn't support FOR UPDATE — fall back to normal get
                order_repo_tmp = OrderRepository(session)
                order = order_repo_tmp.get(order_id)

            order_repo = OrderRepository(session)

            if not order:
                logger.error(f"[Dispatch] Order {order_id} not found — aborting matching")
                return {"status": "aborted", "reason": "order_not_found"}

            if order.status not in ("pending", "assigned"):
                logger.info(f"[Dispatch] Order {order_id} already {order.status} — skipping matching")
                return {"status": "skipped", "reason": f"order_is_{order.status}"}

            # ── Find best driver ──────────────────────
            svc          = getattr(current_app, "matching", None)
            redis_svc    = getattr(current_app, "redis",    None)
            best_driver  = None

            lat = pickup_lat or order.pickup_lat
            lng = pickup_lng or order.pickup_lng
            if lat is None or lng is None:
                if order.restaurant and order.restaurant.latitude is not None:
                    lat = order.restaurant.latitude
                    lng = order.restaurant.longitude

            if lat is None or lng is None:
                return _handle_missing_coords(order_id, order, session, order_repo)

            if svc:
                best_driver = svc.find_best_driver(
                    order_id      = order_id,
                    pickup_coords = {"lat": lat, "lng": lng} if lat is not None else None,
                    restaurant_id = restaurant_id,
                )

            # Fallback: nearest online driver from Redis location cache
            if not best_driver and redis_svc and lat is not None:
                online = redis_svc.locations.get_all_online()
                best_driver = _nearest_driver(online, lat, lng, session)

            # Last resort: any available driver
            if not best_driver:
                user_repo   = UserRepository(session)
                available   = user_repo.find_available_drivers()
                if available:
                    best_driver = {"id": available[0].id, "phone": available[0].phone,
                                   "name": available[0].full_name}

            if not best_driver:
                elapsed = round(time.monotonic() - t_start, 2)
                logger.warning(
                    f"[Dispatch Metric] order={order_id} attempt={attempt} "
                    f"result=no_driver elapsed={elapsed}s — scheduling retry"
                )
                try:
                    from celery_app import USE_EAGER
                    if USE_EAGER:
                        logger.warning("EAGER MODE: aborting driver matching retry to prevent API blocking.")
                        return _handle_no_driver(order_id, order, session, order_repo)

                    raise self.retry(countdown=RETRY_DELAY_SECONDS)
                except MaxRetriesExceededError:
                    return _handle_no_driver(order_id, order, session, order_repo)

            # ── Assign driver ─────────────────────────
            order_repo.assign_driver(order, best_driver["id"])

            elapsed = round(time.monotonic() - t_start, 2)
            logger.info(
                f"[Dispatch Metric] order={order_id} driver={best_driver['id']} "
                f"attempt={attempt} result=assigned elapsed={elapsed}s"
            )

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
    - Fully releases the order (status→pending, driver_id→None).
    - Records a drop/warning on the previous driver.
    - Re-triggers matching with a short countdown.
    """
    logger.info(f"[Dispatch] Reassigning order {order_id} (previous driver: {previous_driver_id})")

    from database import transaction
    from database.repositories import OrderRepository, UserRepository
    from datetime import datetime, timezone

    saved_restaurant_id = None
    saved_pickup_lat    = None
    saved_pickup_lng    = None

    try:
        with transaction() as session:
            order_repo = OrderRepository(session)
            order      = order_repo.get(order_id)
            if not order:
                logger.error(f"[Dispatch] Reassign: order {order_id} not found")
                return

            # Save coords before reset (needed for re-matching)
            saved_restaurant_id = order.restaurant_id
            saved_pickup_lat    = order.pickup_lat
            saved_pickup_lng    = order.pickup_lng

            # Fully release the order — reset driver_id AND status back to pending
            # This is critical: without driver_id=None, the order stays "reserved"
            # for a driver that has already dropped it.
            order_repo.update(
                order,
                status="pending",
                driver_id=None,
                updated_at=datetime.now(timezone.utc)
            )
            logger.info(f"[Dispatch] Order {order_id} fully released back to pending (driver_id cleared)")

            # Record drop on driver profile — mark rating warning
            user_repo = UserRepository(session)
            driver    = user_repo.get(previous_driver_id)
            if driver:
                user_repo.update(driver, rating_warning=True)
                logger.warning(
                    f"[Dispatch Metric] driver={previous_driver_id} event=order_dropped "
                    f"order={order_id} — rating_warning set"
                )

    except Exception as e:
        logger.error(f"reassign_driver failed [{order_id}]: {e}")
        raise

    # Trigger fresh matching AFTER the transaction commits
    # (so the order is fully released before the new matching attempt reads it)
    assign_driver.apply_async(
        args     = [order_id, saved_restaurant_id],
        kwargs   = {"pickup_lat": saved_pickup_lat, "pickup_lng": saved_pickup_lng},
        countdown = 5,
    )
    logger.info(f"[Dispatch] Fresh matching triggered for order {order_id}")


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


def _handle_missing_coords(order_id, order, session, order_repo) -> dict:
    """Called when coordinates are missing — cancel immediately and alert customer."""
    logger.error(f"Order {order_id} has missing coordinates — cancelling order")
    order_repo.cancel(order, actor_role="system", actor_id="auto",
                      reason="Missing delivery location coordinates")

    user_repo = UserRepository(session)
    customer  = user_repo.get(order.customer_id)
    if customer:
        from routes.notifications import push_notification
        from tasks.notify import send_sms
        try:
            push_notification(
                user_id=customer.id,
                type_="order_cancelled",
                title="Order Cancelled — GPS Missing",
                body="Your order was cancelled because your location coordinates are missing. Please enable location services or select your address on the map.",
                icon="bell",
                order_id=order.id
            )
            send_sms.delay(
                to=customer.phone,
                body="🐺 Wolfie: Your order was cancelled because your location coordinates are missing. Please enable location/GPS services or select your address on the map."
            )
            logger.info(f"Sent location alert and in-app warning to customer {customer.id} for missing order coords")
        except Exception as e:
            logger.warning(f"Could not notify customer about missing coordinates: {e}")

    return {"status": "cancelled", "reason": "missing_coordinates"}

