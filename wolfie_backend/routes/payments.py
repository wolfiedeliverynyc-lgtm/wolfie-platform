"""
╔══════════════════════════════════════════════════════════════╗
║   WOLFIE DELIVERY — routes/payments.py  (v3 — Repositories) ║
╚══════════════════════════════════════════════════════════════╝
"""

import logging
from flask import Blueprint, request, jsonify, current_app
from routes.auth import require_auth
from database import transaction, get_db_session
from database.repositories import OrderRepository
from database.repositories.payment import (
    PaymentRepository, DriverPayoutRepository, RestaurantPayoutRepository
)

payments_bp = Blueprint("payments", __name__)
logger      = logging.getLogger("wolfie")


def _stripe():
    import stripe
    stripe.api_key = current_app.config.get("STRIPE_SECRET_KEY")
    return stripe


# ══════════════════════════════════════════════════════════════
# CREATE INTENT
# ══════════════════════════════════════════════════════════════

@payments_bp.route("/create-intent", methods=["POST"])
@require_auth(["customer"])
def create_payment_intent():
    data     = request.get_json(silent=True) or {}
    order_id = data.get("order_id")
    if not order_id:
        return jsonify({"error": "order_id required"}), 400

    try:
        with get_db_session() as session:
            order_repo = OrderRepository(session)
            order      = order_repo.get(order_id)
            if not order:
                return jsonify({"error": "Order not found"}), 404

            pay_repo = PaymentRepository(session)
            existing = pay_repo.find_by_order(order_id)
            if existing and existing.status == "completed":
                return jsonify({"error": "Order already paid"}), 400

            total_cents = int(round(order.total * 100))

            s      = _stripe()
            intent = s.PaymentIntent.create(
                amount               = total_cents,
                currency             = "usd",
                payment_method_types = ["card"],
                metadata             = {
                    "order_id":      order_id,
                    "customer_id":   order.customer_id,
                    "restaurant_id": order.restaurant_id,
                },
                description = f"Wolfie Delivery #{order_id[:8]}",
            )

        return jsonify({
            "client_secret": intent.client_secret,
            "payment_intent_id": intent.id,
            "amount": total_cents,
        }), 200

    except Exception as e:
        logger.error(f"create_payment_intent: {e}")
        return jsonify({"error": str(e)}), 500


# ══════════════════════════════════════════════════════════════
# CONFIRM CASH PAYMENT
# ══════════════════════════════════════════════════════════════

@payments_bp.route("/confirm-cash", methods=["POST"])
@require_auth(["driver"])
def confirm_cash_payment():
    data     = request.get_json(silent=True) or {}
    order_id = data.get("order_id")
    if not order_id:
        return jsonify({"error": "order_id required"}), 400

    try:
        with transaction() as session:
            order_repo = OrderRepository(session)
            order      = order_repo.get_or_404(order_id)

            if order.payment_method != "cash":
                return jsonify({"error": "Not a cash order"}), 400

            pay_repo = PaymentRepository(session)
            existing = pay_repo.find_by_order(order_id)

            if existing:
                pay_repo.mark_completed(existing)
            else:
                payment = pay_repo.create(
                    order_id    = order_id,
                    customer_id = order.customer_id,
                    amount      = order.total,
                    method      = "cash",
                )
                pay_repo.mark_completed(payment)

            # Create payouts
            driver_repo = DriverPayoutRepository(session)
            driver_repo.create(
                driver_id  = order.driver_id,
                order_id   = order_id,
                amount     = order.driver_payout,
            )

            rest_repo = RestaurantPayoutRepository(session)
            rest_repo.create(
                restaurant_id = order.restaurant_id,
                order_id      = order_id,
                net_amount    = order.subtotal - order.restaurant_commission,
                commission    = order.restaurant_commission,
            )

        return jsonify({"message": "Cash payment confirmed", "order_id": order_id}), 200

    except LookupError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        logger.error(f"confirm_cash: {e}")
        return jsonify({"error": "Payment confirmation failed"}), 500


# ══════════════════════════════════════════════════════════════
# STRIPE WEBHOOK
# ══════════════════════════════════════════════════════════════

@payments_bp.route("/webhook", methods=["POST"])
def stripe_webhook():
    payload    = request.get_data()
    sig_header = request.headers.get("Stripe-Signature")
    secret     = current_app.config.get("STRIPE_WEBHOOK_SECRET")

    try:
        s     = _stripe()
        event = s.Webhook.construct_event(payload, sig_header, secret)
    except Exception as e:
        logger.error(f"Webhook signature failed: {e}")
        return jsonify({"error": str(e)}), 400

    if event["type"] == "payment_intent.succeeded":
        intent   = event["data"]["object"]
        order_id = intent["metadata"].get("order_id")
        if order_id:
            try:
                assigned_driver = None
                order_data_to_emit = None
                restaurant_id = None

                with transaction() as session:
                    pay_repo = PaymentRepository(session)
                    payment  = pay_repo.find_by_order(order_id)
                    if payment:
                        pay_repo.mark_completed(payment, stripe_charge_id=intent.get("latest_charge"))
                    else:
                        order_repo = OrderRepository(session)
                        order      = order_repo.get(order_id)
                        if order:
                            p = pay_repo.create(
                                order_id    = order_id,
                                customer_id = order.customer_id,
                                amount      = order.total,
                                method      = "stripe",
                                stripe_payment_intent_id = intent["id"],
                            )
                            pay_repo.mark_completed(p, stripe_charge_id=intent.get("latest_charge"))

                    # Fetch order to do matching
                    order_repo = OrderRepository(session)
                    order      = order_repo.get(order_id)
                    if order:
                        restaurant_id = order.restaurant_id
                        # Trigger driver matching/assignment
                        matching_svc = getattr(current_app, "matching", None)

                        if matching_svc:
                            try:
                                route_info = order.route_info or {}
                                assigned_driver = matching_svc.find_best_driver(
                                    order_id      = order.id,
                                    pickup_coords = route_info.get("pickup_coords"),
                                    restaurant_id = order.restaurant_id,
                                )
                                if assigned_driver:
                                    order_repo.assign_driver(order, assigned_driver["id"])
                            except Exception as e:
                                logger.warning(f"Smart matching error in webhook: {e}")

                        if not order.driver_id:
                            try:
                                from tasks.matching import assign_driver
                                route_info = order.route_info or {}
                                assign_driver(
                                    order_id      = order.id,
                                    restaurant_id = order.restaurant_id,
                                    pickup_lat    = route_info.get("pickup_coords", {}).get("lat") if route_info.get("pickup_coords") else None,
                                    pickup_lng    = route_info.get("pickup_coords", {}).get("lng") if route_info.get("pickup_coords") else None
                                )
                                logger.info(f"Asynchronous driver assignment scheduled for order {order.id} via webhook")
                            except Exception as ex:
                                logger.error(f"Failed to queue Celery assignment task in webhook: {ex}")

                        # Prepare data for socket emission outside transaction
                        order_data_to_emit = order_repo.to_dict(order)

                # Now emit socket events outside transaction to avoid blocking DB
                if order_data_to_emit:
                    try:
                        from app import socketio
                        # Notify customer
                        socketio.emit("order_status_update", {
                            "order_id": order_id,
                            "status": order_data_to_emit["status"]
                        }, room=f"order_{order_id}")

                        # Notify restaurant
                        if restaurant_id:
                            socketio.emit("incoming_order", order_data_to_emit, room=f"restaurant_{restaurant_id}")
                    except Exception as e:
                        logger.warning(f"Webhook WS emit failed: {e}")

            except Exception as e:
                logger.error(f"Webhook processing failed: {e}")

    elif event["type"] == "payment_intent.payment_failed":
        intent   = event["data"]["object"]
        order_id = intent["metadata"].get("order_id")
        if order_id:
            try:
                with transaction() as session:
                    pay_repo = PaymentRepository(session)
                    payment  = pay_repo.find_by_order(order_id)
                    if payment:
                        pay_repo.mark_failed(payment, reason=intent.get("last_payment_error", {}).get("message"))
                    
                    order_repo = OrderRepository(session)
                    order = order_repo.get(order_id)
                    if order and order.status not in ["cancelled", "delivered"]:
                        order_repo.cancel(order, actor_role="admin", actor_id="system", reason="Payment failed")
                        from app import socketio
                        socketio.emit("order_status_update", {"id": order_id, "status": "cancelled", "reason": "Payment failed"}, room=f"customer_{order.customer_id}")
            except Exception as e:
                logger.error(f"Webhook failed event: {e}")

    return jsonify({"received": True}), 200


# ══════════════════════════════════════════════════════════════
# REFUND
# ══════════════════════════════════════════════════════════════

@payments_bp.route("/refund", methods=["POST"])
@require_auth(["admin"])
def refund_payment():
    data     = request.get_json(silent=True) or {}
    order_id = data.get("order_id")
    if not order_id:
        return jsonify({"error": "order_id required"}), 400

    try:
        with transaction() as session:
            pay_repo = PaymentRepository(session)
            payment  = pay_repo.find_by_order(order_id)
            if not payment:
                return jsonify({"error": "Payment not found"}), 404
            if payment.status != "completed":
                return jsonify({"error": "Can only refund completed payments"}), 400

            refund_id = None
            if payment.stripe_charge_id:
                s      = _stripe()
                refund = s.Refund.create(charge=payment.stripe_charge_id)
                refund_id = refund.id

            pay_repo.mark_refunded(payment, refund_id=refund_id)

        return jsonify({"message": "Refund processed", "order_id": order_id}), 200

    except Exception as e:
        logger.error(f"refund: {e}")
        return jsonify({"error": str(e)}), 500


# ══════════════════════════════════════════════════════════════
# PAYOUTS
# ══════════════════════════════════════════════════════════════

@payments_bp.route("/driver/earnings", methods=["GET"])
@require_auth(["driver", "admin"])
def driver_earnings():
    driver_id = request.args.get("driver_id") or request.user_id
    with get_db_session() as session:
        repo    = DriverPayoutRepository(session)
        payouts = repo.find_by_driver(driver_id)
        total   = sum(p.amount for p in payouts if p.status == "paid")
        pending = sum(p.amount for p in payouts if p.status == "pending")
        return jsonify({
            "driver_id":       driver_id,
            "total_paid":      round(total,   2),
            "pending_payout":  round(pending, 2),
            "payout_count":    len(payouts),
        }), 200


@payments_bp.route("/restaurant/payouts", methods=["GET"])
@require_auth(["restaurant", "admin"])
def restaurant_payouts():
    restaurant_id = request.args.get("restaurant_id") or request.user_id
    with get_db_session() as session:
        repo    = RestaurantPayoutRepository(session)
        payouts = repo.find_by_restaurant(restaurant_id)
        total   = sum(p.net_amount for p in payouts if p.status == "paid")
        pending = sum(p.net_amount for p in payouts if p.status == "pending")
        return jsonify({
            "restaurant_id":  restaurant_id,
            "total_paid":     round(total,   2),
            "pending_payout": round(pending, 2),
            "payout_count":   len(payouts),
        }), 200
