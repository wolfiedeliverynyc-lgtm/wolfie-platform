"""
╔══════════════════════════════════════════════════════════════════════════════╗
║          WOLFIE DELIVERY — tasks/notify.py                                  ║
║          SMS · Push · Order alerts · Trial expiry · Stale orders            ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import logging
from datetime import datetime, timezone, timedelta
from celery_app import celery
from celery.exceptions import MaxRetriesExceededError

logger = logging.getLogger("wolfie.tasks.notify")
UTC    = timezone.utc


# ══════════════════════════════════════════════════════════════════════════════
# SMS
# ══════════════════════════════════════════════════════════════════════════════

@celery.task(
    name        = "tasks.notify.send_sms",
    queue       = "notifications",
    bind        = True,
    max_retries = 5,
    default_retry_delay = 30,
)
def send_sms(self, to: str, body: str, order_id: str = None):
    """
    Send SMS via Twilio. Retries up to 5x with exponential backoff.
    """
    from flask import current_app
    try:
        push = getattr(current_app, "push", None)
        if not push:
            logger.warning(f"Push service not available — SMS to {to} dropped")
            return {"status": "skipped", "reason": "no_push_service"}

        result = push.send_sms(to=to, body=body)
        logger.info(f"SMS sent to {to}" + (f" [order:{order_id}]" if order_id else ""))
        return {"status": "sent", "to": to}

    except Exception as e:
        logger.error(f"SMS failed to {to}: {e}")
        try:
            delay = 30 * (2 ** self.request.retries)   # exponential backoff
            raise self.retry(exc=e, countdown=delay)
        except MaxRetriesExceededError:
            logger.error(f"SMS permanently failed to {to} after {self.max_retries} retries")
            return {"status": "failed", "to": to, "error": str(e)}


# ══════════════════════════════════════════════════════════════════════════════
# ORDER LIFECYCLE NOTIFICATIONS
# ══════════════════════════════════════════════════════════════════════════════

@celery.task(name="tasks.notify.order_confirmed", queue="notifications")
def order_confirmed(order_id: str, customer_phone: str, total: float, eta_min: int):
    """Customer gets SMS when order is placed."""
    send_sms.delay(
        to       = customer_phone,
        body     = f"🐺 Wolfie: Order confirmed! Total: ${total:.2f}. ETA ~{eta_min} min. Track: wolfie.app/track/{order_id[:8]}",
        order_id = order_id,
    )


@celery.task(name="tasks.notify.driver_assigned", queue="notifications")
def driver_assigned(order_id: str, customer_phone: str, driver_name: str, eta_min: int):
    """Customer gets SMS when driver is assigned."""
    send_sms.delay(
        to       = customer_phone,
        body     = f"🐺 Wolfie: {driver_name} is picking up your order! ETA ~{eta_min} min.",
        order_id = order_id,
    )


@celery.task(name="tasks.notify.order_picked_up", queue="notifications")
def order_picked_up(order_id: str, customer_phone: str, eta_min: int):
    """Customer gets SMS when driver picks up the food."""
    send_sms.delay(
        to       = customer_phone,
        body     = f"🐺 Wolfie: Your food is on the way! ETA ~{eta_min} min. Live track: wolfie.app/track/{order_id[:8]}",
        order_id = order_id,
    )


@celery.task(name="tasks.notify.order_delivered", queue="notifications")
def order_delivered(order_id: str, customer_phone: str):
    """Customer gets SMS on delivery + rating request."""
    send_sms.delay(
        to       = customer_phone,
        body     = f"🐺 Wolfie: Your order was delivered! Rate your experience: wolfie.app/rate/{order_id[:8]}",
        order_id = order_id,
    )
    # Schedule rating request after 5 min delay
    request_rating.apply_async(
        args    = [order_id, customer_phone],
        countdown = 300,
    )


@celery.task(name="tasks.notify.order_cancelled", queue="notifications")
def order_cancelled(order_id: str, customer_phone: str, reason: str = None):
    """Customer gets SMS on cancellation."""
    body = f"🐺 Wolfie: Your order was cancelled."
    if reason:
        body += f" Reason: {reason}."
    body += " Contact support: wolfie.app/support"
    send_sms.delay(to=customer_phone, body=body, order_id=order_id)


@celery.task(name="tasks.notify.notify_restaurant", queue="notifications")
def notify_restaurant(order_id: str, restaurant_phone: str, event: str, details: dict = None):
    """Restaurant gets notified on new order or cancellation."""
    messages = {
        "new_order":  f"🐺 New Wolfie order #{order_id[:8]}! Open your dashboard to accept.",
        "cancelled":  f"🐺 Order #{order_id[:8]} was cancelled. No action needed.",
        "driver_arriving": f"🐺 Driver arriving soon for order #{order_id[:8]}.",
    }
    body = messages.get(event, f"🐺 Update on order #{order_id[:8]}: {event}")
    send_sms.delay(to=restaurant_phone, body=body, order_id=order_id)


@celery.task(name="tasks.notify.notify_driver", queue="notifications")
def notify_driver(order_id: str, driver_phone: str, event: str, details: dict = None):
    """Driver gets notified of new assignment."""
    messages = {
        "assigned":  f"🐺 New delivery! Order #{order_id[:8]}. Open the app to accept.",
        "cancelled": f"🐺 Order #{order_id[:8]} was cancelled. You're free for new orders.",
    }
    body = messages.get(event, f"🐺 Update on order #{order_id[:8]}: {event}")
    send_sms.delay(to=driver_phone, body=body, order_id=order_id)


# ══════════════════════════════════════════════════════════════════════════════
# RATING REQUEST
# ══════════════════════════════════════════════════════════════════════════════

@celery.task(name="tasks.notify.request_rating", queue="notifications")
def request_rating(order_id: str, customer_phone: str):
    """Sent 5 min after delivery — gentle rating nudge."""
    send_sms.delay(
        to   = customer_phone,
        body = f"🐺 How was your Wolfie order? Rate in 10 seconds: wolfie.app/rate/{order_id[:8]}",
    )


# ══════════════════════════════════════════════════════════════════════════════
# SUBSCRIPTION / TRIAL
# ══════════════════════════════════════════════════════════════════════════════

@celery.task(name="tasks.notify.trial_expiring", queue="notifications")
def trial_expiring(driver_id: str, driver_phone: str, days_left: int):
    """Warn driver 3 days before trial ends."""
    send_sms.delay(
        to   = driver_phone,
        body = f"🐺 Wolfie: Your free trial ends in {days_left} day(s). Subscribe now to keep earning: wolfie.app/subscribe",
    )


@celery.task(name="tasks.notify.expire_driver_trials", queue="notifications")
def expire_driver_trials():
    """
    Beat task — runs daily at midnight.
    Expires trials + warns drivers 3 days before expiry.
    """
    from database import transaction
    from database.repositories import UserRepository

    now        = datetime.now(UTC)
    warn_date  = now + timedelta(days=3)
    expired    = 0
    warned     = 0

    try:
        with transaction() as session:
            repo    = UserRepository(session)
            drivers = repo.find_by_role("driver")

            for d in drivers:
                if not d.trial_ends_at:
                    continue

                trial_end = d.trial_ends_at.replace(tzinfo=UTC) if d.trial_ends_at.tzinfo is None else d.trial_ends_at

                # Expired
                if d.subscription_status == "trial" and trial_end < now:
                    repo.update(d, subscription_status="expired", is_available=False)
                    send_sms.delay(
                        to   = d.phone,
                        body = "🐺 Wolfie: Your free trial has ended. Subscribe to continue earning: wolfie.app/subscribe",
                    )
                    expired += 1

                # Warning — 3 days left
                elif d.subscription_status == "trial" and trial_end < warn_date:
                    days_left = (trial_end - now).days + 1
                    trial_expiring.delay(d.id, d.phone, days_left)
                    warned += 1

        logger.info(f"Trial task: {expired} expired, {warned} warned")
        return {"expired": expired, "warned": warned}

    except Exception as e:
        logger.error(f"expire_driver_trials failed: {e}")
        raise


# ══════════════════════════════════════════════════════════════════════════════
# STALE ORDER CLEANUP
# ══════════════════════════════════════════════════════════════════════════════

@celery.task(name="tasks.notify.cancel_stale_orders", queue="notifications")
def cancel_stale_orders():
    """
    Beat task — runs every 10 min.
    Cancels pending orders older than 3 min with no driver assigned.
    """
    from database import transaction
    from database.repositories import OrderRepository, UserRepository
    from order_state_manager import order_state_manager

    cutoff   = datetime.now(UTC) - timedelta(minutes=3)
    cancelled = 0

    try:
        with transaction() as session:
            repo   = OrderRepository(session)
            orders = repo.find_by_status("pending", limit=100)

            for order in orders:
                created = order.created_at.replace(tzinfo=UTC) if order.created_at.tzinfo is None else order.created_at
                if created < cutoff and not order.driver_id:
                    repo.cancel(order, actor_role="system", actor_id="auto",
                                reason="No driver available after 3 minutes")

                    # Notify customer
                    user_repo = UserRepository(session)
                    customer  = user_repo.get(order.customer_id)
                    if customer:
                        order_cancelled.delay(
                            order_id       = order.id,
                            customer_phone = customer.phone,
                            reason         = "No driver available in your area",
                        )
                    cancelled += 1

        logger.info(f"Stale orders cancelled: {cancelled}")
        return {"cancelled": cancelled}

    except Exception as e:
        logger.error(f"cancel_stale_orders failed: {e}")
        raise

# ══════════════════════════════════════════════════════════════════════════════
# WAP ALERTS
# ══════════════════════════════════════════════════════════════════════════════

@celery.task(name="tasks.notify.notify_eta_update", queue="notifications")
def notify_eta_update(order_id: str, user_id: str, eta_min: float, role: str):
    """
    Sends a push notification or SMS about updated ETA from WAP Engine.
    """
    from database import get_session
    from database.repositories import UserRepository
    from flask import current_app

    try:
        with get_session() as session:
            user = UserRepository(session).get(user_id)
            if not user or not user.phone:
                return

            if role == "customer":
                body = f"🐺 Wolfie Update: Your new estimated arrival time is ~{eta_min} min."
            elif role == "restaurant":
                body = f"🐺 Wolfie Update: Prep time for order #{order_id[:8]} updated to ~{eta_min} min."
            elif role == "driver":
                body = f"🐺 Wolfie Update: Drive time to delivery updated to ~{eta_min} min."
            else:
                return

            # Push notification if device token exists, otherwise SMS
            push = getattr(current_app, "push", None)
            if push and getattr(user, 'device_token', None):
                push.send_push(user.device_token, "ETA Updated", body)
            else:
                send_sms.delay(to=user.phone, body=body, order_id=order_id)
                
    except Exception as e:
        logger.error(f"notify_eta_update failed: {e}")

@celery.task(name="tasks.notify.notify_wap_anomaly", queue="notifications")
def notify_wap_anomaly(order_id: str, error_percentage: float):
    """
    Alerts the admin team when prediction is way off (> 20% error).
    """
    logger.warning(f"🚨 WAP ANOMALY: Order {order_id} prediction was off by {error_percentage}%")
    # Here you'd integrate with Slack/Discord webhooks for admin alerts

