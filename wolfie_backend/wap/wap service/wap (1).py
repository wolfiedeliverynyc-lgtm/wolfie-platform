"""
╔══════════════════════════════════════════════════════════════════════════════╗
║          tasks/wap.py — WAP Celery Tasks                                    ║
║          ETA notifications, anomaly alerts, model retraining                ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

from celery_app import celery
from database import get_session
from database.schemas import Order, User
from services.wap import WAPEngine


@celery.task(name="tasks.wap.notify_eta_update")
def notify_eta_update(order_id: str, user_id: str, eta_min: float, role: str):
    """
    Send ETA update to stakeholder.

    Roles:
        customer: "Your order arrives in 25 min"
        restaurant: "Prepare in 12 min — driver arrives at 2:30"
        driver: "Pickup in 12 min, delivery in 13 min"
    """

    with get_session() as session:
        user = session.query(User).get(user_id)
        if not user:
            return

        # Format message based on role
        messages = {
            "customer": f"🐺 Your Wolfie order arrives in {int(eta_min)} min",
            "restaurant": f"⏱️ Prep time: {int(eta_min)} min | Driver arrives soon",
            "driver": f"🛵 Pickup: {int(eta_min)} min | Total route: ~{int(eta_min + 5)} min"
        }

        message = messages.get(role, f"ETA: {int(eta_min)} min")

        # Send via preferred channel
        if user.phone:
            from tasks.notify import send_sms
            send_sms.delay(user.phone, message)

        # Push notification
        from tasks.notify import send_push
        send_push.delay(user_id, {
            "title": "Wolfie ETA Update",
            "body": message,
            "data": {"order_id": order_id, "eta_min": eta_min}
        })

        # WebSocket broadcast
        from app import socketio
        socketio.emit("eta_update", {
            "order_id": order_id,
            "eta_min": eta_min,
            "role": role
        }, room=f"order_{order_id}")


@celery.task(name="tasks.wap.notify_wap_anomaly")
def notify_wap_anomaly(order_id: str, error_percentage: float):
    """Alert when prediction is way off (>20% error)."""

    with get_session() as session:
        order = session.query(Order).get(order_id)
        if not order:
            return

        # Alert admin
        from tasks.notify import notify_admin
        notify_admin.delay(
            subject="WAP Prediction Anomaly",
            message=f"Order {order_id}: prediction off by {error_percentage}%"
        )

        # Log for model improvement
        print(f"[WAP Anomaly] Order {order_id}: {error_percentage}% error")


@celery.task(name="tasks.wap.retrain_all_models")
def retrain_all_models():
    """Retrain WAP models for all restaurants (nightly)."""

    with get_session() as session:
        from database.schemas import User

        restaurants = session.query(User).filter_by(role="restaurant").all()

        for restaurant in restaurants:
            try:
                wap = WAPEngine()
                wap._retrain_model(session, restaurant.id)
                print(f"[WAP] Retrained model for {restaurant.full_name}")
            except Exception as e:
                print(f"[WAP] Retrain failed for {restaurant.id}: {e}")
