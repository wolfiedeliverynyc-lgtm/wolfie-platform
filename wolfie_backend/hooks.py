"""
╔══════════════════════════════════════════════════════════════════════════════╗
║          WOLFIE DELIVERY — hooks.py                                         ║
║          Wires Celery tasks to order_state_manager hooks                    ║
╚══════════════════════════════════════════════════════════════════════════════╝

Call register_hooks() once in create_app().

Every state transition automatically triggers the right Celery tasks:

  DELIVERED  → create_order_payouts + order_delivered SMS + track event
  PICKED_UP  → order_picked_up SMS + track event
  READY      → notify_driver SMS
  CANCELLED  → order_cancelled SMS + track event
  ASSIGNED   → notify_driver + notify_restaurant
"""

import logging
from order_state_manager import order_state_manager, OrderState
from routes.notifications import push_notification

logger = logging.getLogger("wolfie.hooks")


def register_hooks():
    """Call this once inside create_app()."""

    # ── ASSIGNED ─────────────────────────────────────────────────────────────
    @order_state_manager.on_state(OrderState.ASSIGNED)
    def on_assigned(order_id: str, result, context: dict):
        from database import get_session
        from database.repositories import OrderRepository, UserRepository

        try:
            with get_session() as session:
                order   = OrderRepository(session).get(order_id)
                if not order:
                    return

                driver  = UserRepository(session).get(order.driver_id) if order.driver_id else None
                rest    = UserRepository(session).get(order.restaurant_id)

                if driver:
                    from tasks.notify import notify_driver
                    notify_driver(order_id, driver.phone, "assigned")

                if rest:
                    from tasks.notify import notify_restaurant
                    notify_restaurant(order_id, rest.phone, "new_order")

                from tasks.analytics import track
                track("order_assigned", {"driver_id": order.driver_id}, user_id=order.customer_id)
                
                if order.customer_id:
                    push_notification(
                        order.customer_id,
                        type_="driver_assigned",
                        title="Driver Assigned!",
                        body=f"{driver.first_name if driver else 'A driver'} is heading to the restaurant.",
                        icon="car",
                        order_id=order_id,
                        link=f"/track/{order_id}"
                    )

        except Exception as e:
            logger.error(f"on_assigned hook failed [{order_id}]: {e}")


    # ── ACCEPTED ──────────────────────────────────────────────────────────────
    @order_state_manager.on_state(OrderState.ACCEPTED)
    def on_accepted(order_id: str, result, context: dict):
        from database import get_session
        from database.repositories import OrderRepository
        from services.wap import WAPEngine
        from tasks.notify import notify_eta_update

        try:
            with get_session() as session:
                order = OrderRepository(session).get(order_id)
                if not order:
                    return

                # Generate prediction
                wap = WAPEngine()
                prediction = wap.predict(
                    order=order,
                    restaurant_id=order.restaurant_id,
                    driver_id=context.get('driver_id'),
                    distance_km=context.get('distance_km')
                )

                # Notify customer
                if order.customer_id:
                    notify_eta_update(
                        order_id=order_id,
                        user_id=order.customer_id,
                        eta_min=prediction.total_eta_min,
                        role="customer"
                    )
                    push_notification(
                        order.customer_id,
                        type_="order_confirmed",
                        title="Order Accepted",
                        body=f"The restaurant is preparing your order. ETA: {prediction.total_eta_min} min.",
                        icon="chef-hat",
                        order_id=order_id,
                        link=f"/track/{order_id}"
                    )

                # Notify restaurant
                notify_eta_update(
                    order_id=order_id,
                    user_id=order.restaurant_id,
                    eta_min=prediction.prep_time_min,
                    role="restaurant"
                )

                # Store in Redis for real-time
                from app import current_app
                if current_app and getattr(current_app, 'redis', None):
                    current_app.redis.hset(f"order:{order_id}:wap", mapping={
                        "eta_min": prediction.total_eta_min,
                        "confidence": prediction.confidence,
                        "predicted_at": prediction.predicted_at.isoformat()
                    })
                    current_app.redis.expire(f"order:{order_id}:wap", 3600)

                logger.info(f"[WAP] Prediction for {order_id}: {prediction.total_eta_min}min (confidence: {prediction.confidence})")

        except Exception as e:
            logger.error(f"on_accepted hook failed [{order_id}]: {e}")


    # ── READY ─────────────────────────────────────────────────────────────────
    @order_state_manager.on_state(OrderState.READY)
    def on_ready(order_id: str, result, context: dict):
        from database import get_session
        from database.repositories import OrderRepository, UserRepository

        try:
            with get_session() as session:
                order  = OrderRepository(session).get(order_id)
                if not order or not order.driver_id:
                    return
                driver = UserRepository(session).get(order.driver_id)
                if driver:
                    from tasks.notify import notify_driver
                    notify_driver(order_id, driver.phone, "assigned")
        except Exception as e:
            logger.error(f"on_ready hook failed [{order_id}]: {e}")


    # ── PICKED_UP ─────────────────────────────────────────────────────────────
    @order_state_manager.on_state(OrderState.PICKED_UP)
    def on_picked_up(order_id: str, result, context: dict):
        from database import get_session
        from database.repositories import OrderRepository, UserRepository

        try:
            with get_session() as session:
                order    = OrderRepository(session).get(order_id)
                customer = UserRepository(session).get(order.customer_id) if order else None
                if customer:
                    from tasks.notify import order_picked_up
                    order_picked_up(order_id, customer.phone,
                                          eta_min=order.eta_minutes or 15)

                from tasks.analytics import track
                track("order_picked_up", user_id=order.customer_id if order else None)
                
                if order and order.customer_id:
                    push_notification(
                        order.customer_id,
                        type_="order_picked_up",
                        title="Order Picked Up",
                        body="Your driver is on the way with your food!",
                        icon="navigation",
                        order_id=order_id,
                        link=f"/track/{order_id}"
                    )

        except Exception as e:
            logger.error(f"on_picked_up hook failed [{order_id}]: {e}")


    # ── DELIVERED ─────────────────────────────────────────────────────────────
    @order_state_manager.on_state(OrderState.DELIVERED)
    def on_delivered(order_id: str, result, context: dict):
        from database import get_session
        from database.repositories import OrderRepository, UserRepository

        try:
            with get_session() as session:
                order    = OrderRepository(session).get(order_id)
                customer = UserRepository(session).get(order.customer_id) if order else None

                # SMS notification
                if customer:
                    from tasks.notify import order_delivered
                    order_delivered(order_id, customer.phone)

                # Financial: create payout records
                from tasks.payouts import create_order_payouts
                create_order_payouts(order_id)

                # Analytics
                from tasks.analytics import track
                track("order_delivered", {
                    "total":       order.total if order else 0,
                    "driver_id":   order.driver_id if order else None,
                }, user_id=order.customer_id if order else None)
                
                if order and order.customer_id:
                    push_notification(
                        order.customer_id,
                        type_="order_delivered",
                        title="Order Delivered",
                        body="Enjoy your food! Tap to rate your experience.",
                        icon="check-circle",
                        order_id=order_id,
                        link=f"/my-orders"
                    )

                # WAP Feedback
                try:
                    from services.wap import WAPEngine
                    wap = WAPEngine()
                    feedback = wap.record_feedback(order_id)

                    if feedback:
                        logger.info(
                            f"[WAP] Feedback for {order_id}: "
                            f"predicted={feedback.predicted_total}min, "
                            f"actual={feedback.actual_total}min, "
                            f"error={feedback.error_percentage}%"
                        )

                        # If error > 20%, trigger alert
                        if abs(feedback.error_percentage) > 20:
                            from tasks.notify import notify_wap_anomaly
                            # Assuming notify_wap_anomaly exists or can just pass silently
                            if hasattr(notify_wap_anomaly, 'delay'):
                                notify_wap_anomaly(order_id, feedback.error_percentage)
                except Exception as wap_e:
                    logger.error(f"[WAP] Feedback failed for {order_id}: {wap_e}")

        except Exception as e:
            logger.error(f"on_delivered hook failed [{order_id}]: {e}")


    # ── CANCELLED ─────────────────────────────────────────────────────────────
    @order_state_manager.on_state(OrderState.CANCELLED)
    def on_cancelled(order_id: str, result, context: dict):
        from database import get_session
        from database.repositories import OrderRepository, UserRepository

        try:
            with get_session() as session:
                order    = OrderRepository(session).get(order_id)
                customer = UserRepository(session).get(order.customer_id) if order else None

                if customer:
                    from tasks.notify import order_cancelled
                    order_cancelled(
                        order_id       = order_id,
                        customer_phone = customer.phone,
                        reason         = order.cancellation_reason if order else None,
                    )

                from tasks.analytics import track
                track("order_cancelled", {
                    "reason": order.cancellation_reason if order else None,
                }, user_id=order.customer_id if order else None)
                
                if order and order.customer_id:
                    push_notification(
                        order.customer_id,
                        type_="order_cancelled",
                        title="Order Cancelled",
                        body=f"Your order was cancelled. Reason: {order.cancellation_reason or 'Unknown'}",
                        icon="x-circle",
                        order_id=order_id,
                        link=f"/my-orders"
                    )

        except Exception as e:
            logger.error(f"on_cancelled hook failed [{order_id}]: {e}")


    logger.info("✅ Order state hooks registered")
