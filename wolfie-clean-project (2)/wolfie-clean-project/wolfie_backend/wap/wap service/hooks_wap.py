
# Add to hooks.py — WAP Integration

@order_state_manager.on_state(OrderState.PENDING)
def on_pending_wap(order_id: str, result, context: dict):
    """Generate WAP prediction when order is created."""
    from services.wap import WAPEngine
    from database import get_session
    from database.repositories import OrderRepository

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

            # Broadcast to all stakeholders
            from tasks.notify import notify_eta_update

            # Notify customer
            if order.customer_id:
                notify_eta_update.delay(
                    order_id=order_id,
                    user_id=order.customer_id,
                    eta_min=prediction.total_eta_min,
                    role="customer"
                )

            # Notify restaurant
            notify_eta_update.delay(
                order_id=order_id,
                user_id=order.restaurant_id,
                eta_min=prediction.prep_time_min,
                role="restaurant"
            )

            # Notify driver (if assigned)
            if order.driver_id:
                notify_eta_update.delay(
                    order_id=order_id,
                    user_id=order.driver_id,
                    eta_min=prediction.drive_time_min,
                    role="driver"
                )

            # Store in Redis for real-time
            from app import current_app
            if current_app.redis:
                current_app.redis.hset(f"order:{order_id}:wap", mapping={
                    "eta_min": prediction.total_eta_min,
                    "confidence": prediction.confidence,
                    "predicted_at": prediction.predicted_at.isoformat()
                })
                current_app.redis.expire(f"order:{order_id}:wap", 3600)

            logger.info(f"[WAP] Prediction for {order_id}: {prediction.total_eta_min}min (confidence: {prediction.confidence})")

    except Exception as e:
        logger.error(f"[WAP] Prediction failed for {order_id}: {e}")


@order_state_manager.on_state(OrderState.DELIVERED)
def on_delivered_wap_feedback(order_id: str, result, context: dict):
    """Record WAP feedback when order is delivered."""
    from services.wap import WAPEngine

    try:
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
                notify_wap_anomaly.delay(order_id, feedback.error_percentage)

    except Exception as e:
        logger.error(f"[WAP] Feedback failed for {order_id}: {e}")
