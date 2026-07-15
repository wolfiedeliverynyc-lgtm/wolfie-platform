"""
╔══════════════════════════════════════════════════════════════════════════════╗
║          WOLFIE DELIVERY — tasks/payouts.py                                 ║
║          Driver + Restaurant payout processing with Stripe                  ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import logging
from datetime import datetime, timezone, timedelta
from celery_app import celery
from celery.exceptions import MaxRetriesExceededError

logger = logging.getLogger("wolfie.tasks.payouts")
UTC    = timezone.utc


# ══════════════════════════════════════════════════════════════════════════════
# CREATE PAYOUTS AFTER DELIVERY
# ══════════════════════════════════════════════════════════════════════════════

@celery.task(
    name        = "tasks.payouts.create_order_payouts",
    queue       = "payouts",
    bind        = True,
    max_retries = 3,
    default_retry_delay = 60,
)
def create_order_payouts(self, order_id: str):
    """
    Called after order is DELIVERED.
    Creates driver payout + restaurant payout records.
    Both happen in a single transaction — atomic.
    """
    from database import transaction
    from database.repositories import OrderRepository
    from database.repositories.payment import DriverPayoutRepository, RestaurantPayoutRepository

    try:
        with transaction() as session:
            order_repo = OrderRepository(session)
            order      = order_repo.get(order_id)

            if not order:
                logger.error(f"create_order_payouts: order {order_id} not found")
                return {"status": "skipped", "reason": "order_not_found"}

            if order.status != "delivered":
                logger.warning(f"create_order_payouts: order {order_id} is {order.status} — skipping")
                return {"status": "skipped", "reason": f"order_is_{order.status}"}

            # Week identifier for grouping payouts
            week_start = _get_week_start()

            # Driver payout
            if order.driver_id and order.driver_payout:
                driver_repo = DriverPayoutRepository(session)
                driver_repo.create(
                    driver_id  = order.driver_id,
                    order_id   = order_id,
                    amount     = order.driver_payout,
                    week_start = week_start,
                )

            # Restaurant payout
            if order.restaurant_id and order.subtotal:
                net_amount  = order.subtotal - (order.restaurant_commission or 0)
                rest_repo   = RestaurantPayoutRepository(session)
                rest_repo.create(
                    restaurant_id = order.restaurant_id,
                    order_id      = order_id,
                    net_amount    = max(net_amount, 0),
                    commission    = order.restaurant_commission or 0,
                )

        logger.info(f"Payouts created for order {order_id} ✅")
        return {"status": "created", "order_id": order_id}

    except Exception as e:
        logger.error(f"create_order_payouts failed [{order_id}]: {e}")
        try:
            raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
        except MaxRetriesExceededError:
            logger.error(f"Payout creation permanently failed for {order_id}")
            return {"status": "failed", "error": str(e)}


# ══════════════════════════════════════════════════════════════════════════════
# PROCESS PENDING PAYOUTS (Beat task — runs hourly)
# ══════════════════════════════════════════════════════════════════════════════

@celery.task(name="tasks.payouts.process_pending_payouts", queue="payouts")
def process_pending_payouts():
    """
    Beat task — runs every hour.
    Marks pending payouts as paid (for cash model — no Stripe transfer needed).
    For card payments: would trigger Stripe payout here.
    """
    from database import transaction
    from database.repositories.payment import DriverPayoutRepository, RestaurantPayoutRepository
    from database.schemas import DriverPayout, RestaurantOrderPayout
    from sqlalchemy import select

    driver_paid = rest_paid = 0
    cutoff      = datetime.now(UTC) - timedelta(hours=1)

    try:
        with transaction() as session:
            # Driver payouts
            driver_payouts = session.scalars(
                select(DriverPayout)
                .where(DriverPayout.status == "pending")
                .where(DriverPayout.created_at <= cutoff)
                .limit(500)
            ).all()

            for p in driver_payouts:
                p.status     = "paid"
                p.updated_at = datetime.now(UTC)
                driver_paid += 1

            # Restaurant payouts
            rest_payouts = session.scalars(
                select(RestaurantOrderPayout)
                .where(RestaurantOrderPayout.status == "pending")
                .where(RestaurantOrderPayout.created_at <= cutoff)
                .limit(500)
            ).all()

            for p in rest_payouts:
                p.status     = "paid"
                p.updated_at = datetime.now(UTC)
                rest_paid   += 1

        logger.info(f"Payouts processed: {driver_paid} driver, {rest_paid} restaurant")
        return {"driver_paid": driver_paid, "restaurant_paid": rest_paid}

    except Exception as e:
        logger.error(f"process_pending_payouts failed: {e}")
        raise


# ══════════════════════════════════════════════════════════════════════════════
# STRIPE PAYOUT  (when bank transfers enabled)
# ══════════════════════════════════════════════════════════════════════════════

@celery.task(
    name        = "tasks.payouts.stripe_payout",
    queue       = "payouts",
    bind        = True,
    max_retries = 3,
    default_retry_delay = 120,
)
def stripe_payout(self, driver_id: str, amount: float, stripe_account_id: str):
    """
    Transfer earnings to driver's Stripe Connect account.
    Used when drivers have bank accounts linked.
    """
    from flask import current_app
    try:
        import stripe
        stripe.api_key = current_app.config.get("STRIPE_SECRET_KEY")

        amount_cents = int(round(amount * 100))
        transfer = stripe.Transfer.create(
            amount      = amount_cents,
            currency    = "usd",
            destination = stripe_account_id,
            metadata    = {"driver_id": driver_id},
        )

        logger.info(f"Stripe transfer {transfer.id} — ${amount:.2f} to driver {driver_id}")
        return {"status": "transferred", "transfer_id": transfer.id, "amount": amount}

    except Exception as e:
        logger.error(f"stripe_payout failed [{driver_id}]: {e}")
        try:
            raise self.retry(exc=e, countdown=120 * (2 ** self.request.retries))
        except MaxRetriesExceededError:
            return {"status": "failed", "driver_id": driver_id, "error": str(e)}


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _get_week_start() -> str:
    """Returns ISO week start date string (Monday)."""
    today = datetime.now(UTC).date()
    monday = today - timedelta(days=today.weekday())
    return str(monday)
