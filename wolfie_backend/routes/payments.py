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
from validation import validate_request, CreateIntentSchema, RefundPaymentSchema

payments_bp = Blueprint("payments", __name__)
logger      = logging.getLogger("wolfie")


def _payment_svc():
    svc = getattr(current_app, "payment_service", None)
    if not svc:
        from services.payment import PaymentService
        svc = PaymentService(
            stripe_key=current_app.config.get("STRIPE_SECRET_KEY"),
            webhook_secret=current_app.config.get("STRIPE_WEBHOOK_SECRET")
        )
    return svc


# ══════════════════════════════════════════════════════════════
# CREATE INTENT
# ══════════════════════════════════════════════════════════════

@payments_bp.route("/create-intent", methods=["POST"])
@require_auth(["customer", "admin"])
@validate_request(CreateIntentSchema)
def create_payment_intent():
    payload_data = request.validated_data
    order_id = payload_data.order_id
    amount   = payload_data.amount
    currency = (payload_data.currency or "usd").lower()
    
    if not order_id and not amount:
        return jsonify({"error": "order_id or amount required"}), 400

    try:
        customer_id = getattr(request, "user_id", None)
        restaurant_id = None
        amount_dollars = 0.0

        if order_id:
            with get_db_session() as session:
                order_repo = OrderRepository(session)
                order      = order_repo.get(order_id)
                if not order:
                    return jsonify({"error": "Order not found"}), 404

                # BOLA check: customer can only pay for their own order
                if getattr(request, "user_role", None) == "customer" and order.customer_id != customer_id:
                    return jsonify({"error": "Unauthorized: Cannot pay for another customer's order"}), 403

                pay_repo = PaymentRepository(session)
                existing = pay_repo.find_by_order(order_id)
                if existing and existing.status == "completed":
                    return jsonify({"error": "Order already paid"}), 400

                amount_dollars = float(order.total)
                customer_id    = order.customer_id
                restaurant_id  = order.restaurant_id
        else:
            amount_dollars = float(amount) / 100.0 if amount > 100 else float(amount)

        pay_svc = _payment_svc()
        intent_res = pay_svc.create_intent(
            amount_dollars = amount_dollars,
            order_id       = order_id or "custom",
            customer_id    = customer_id,
            restaurant_id  = restaurant_id,
            currency       = currency
        )

        return jsonify({
            "client_secret":     intent_res["client_secret"],
            "payment_intent_id": intent_res["id"],
            "amount":            intent_res["amount"],
            "currency":          currency,
            "mock":              intent_res.get("mock", False)
        }), 200

    except Exception as e:
        logger.error(f"create_payment_intent: {e}")
        return jsonify({"error": str(e)}), 500


# ══════════════════════════════════════════════════════════════
# CONFIRM CASH PAYMENT
# ══════════════════════════════════════════════════════════════

@payments_bp.route("/confirm-cash", methods=["POST"])
@require_auth(["driver", "restaurant", "admin"])
@validate_request(RefundPaymentSchema)
def confirm_cash_payment():
    order_id = request.validated_data.order_id
    user_id = getattr(request, "user_id", None)
    user_role = getattr(request, "user_role", None)

    try:
        order_dict = None
        with transaction() as session:
            order_repo = OrderRepository(session)
            order      = order_repo.get_or_404(order_id)

            if order.payment_method != "cash":
                return jsonify({"error": "Not a cash order"}), 400

            # BOLA Checks:
            if user_role == "driver" and order.driver_id and order.driver_id != user_id:
                return jsonify({"error": "Unauthorized: You are not assigned to deliver this order"}), 403

            if user_role == "restaurant" and order.restaurant_id != user_id:
                return jsonify({"error": "Unauthorized: You are not the restaurant for this order"}), 403

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

            # Create driver payout if not already created
            driver_repo = DriverPayoutRepository(session)
            existing_dp = driver_repo.find_by_order(order_id)
            if not existing_dp and order.driver_id and order.driver_payout:
                driver_repo.create(
                    driver_id  = order.driver_id,
                    order_id   = order_id,
                    amount     = order.driver_payout,
                )

            # Create restaurant payout if not already created
            rest_repo = RestaurantPayoutRepository(session)
            existing_rp = rest_repo.find_by_order(order_id)
            if not existing_rp and order.restaurant_id and order.subtotal:
                rest_repo.create(
                    restaurant_id = order.restaurant_id,
                    order_id      = order_id,
                    net_amount    = max(0.0, order.subtotal - (order.restaurant_commission or 0.0)),
                    commission    = order.restaurant_commission or 0.0,
                )

            order_dict = order_repo.to_dict(order)

        # Notify customer, driver, and restaurant via WebSocket
        try:
            socketio = current_app.extensions.get("socketio")
            if not socketio:
                from app import socketio
            socketio.emit("payment_confirmed", {
                "order_id": order_id,
                "payment_method": "cash",
                "status": "completed",
                "amount": order_dict.get("total") if order_dict else 0.0,
            }, room=f"order_{order_id}", namespace="/")
        except Exception as ws_err:
            logger.warning(f"Cash payment WS emit failed: {ws_err}")

        # Invalidate Redis order cache
        redis = getattr(current_app, "redis", None)
        if redis:
            try:
                redis.cache.delete(f"order:{order_id}:detail")
            except Exception:
                pass

        return jsonify({
            "message": "Cash payment confirmed successfully",
            "order_id": order_id,
            "status": "completed",
            "payment_method": "cash",
            "driver_payout": order_dict.get("driver_payout") if order_dict else 0.0,
            "restaurant_payout": round(order_dict.get("subtotal", 0) - order_dict.get("restaurant_commission", 0), 2) if order_dict else 0.0
        }), 200

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
        pay_svc = _payment_svc()
        event = pay_svc.verify_webhook(payload, sig_header)
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
                                assign_driver.delay(
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
                        socketio = current_app.extensions.get("socketio")
                        if not socketio:
                            from app import socketio
                        # Notify customer
                        socketio.emit("order_status_update", {
                            "order_id": order_id,
                            "status": order_data_to_emit["status"]
                        }, room=f"order_{order_id}", namespace="/")

                        # Notify restaurant
                        if restaurant_id:
                            socketio.emit("incoming_order", order_data_to_emit, room=f"restaurant_{restaurant_id}", namespace="/")
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
                        socketio = current_app.extensions.get("socketio")
                        if not socketio:
                            from app import socketio
                        socketio.emit("order_status_update", {"id": order_id, "status": "cancelled", "reason": "Payment failed"}, room=f"customer_{order.customer_id}", namespace="/")
            except Exception as e:
                logger.error(f"Webhook failed event: {e}")

    return jsonify({"received": True}), 200


# ══════════════════════════════════════════════════════════════
# REFUND
# ══════════════════════════════════════════════════════════════

@payments_bp.route("/refund", methods=["POST"])
@require_auth(["admin"])
@validate_request(RefundPaymentSchema)
def refund_payment():
    order_id = request.validated_data.order_id

    try:
        with transaction() as session:
            pay_repo = PaymentRepository(session)
            payment  = pay_repo.find_by_order(order_id)
            if not payment:
                return jsonify({"error": "Payment not found"}), 404
            if payment.status != "completed":
                return jsonify({"error": "Can only refund completed payments"}), 400

            refund_id = None
            if payment.stripe_charge_id or payment.stripe_payment_intent_id:
                pay_svc = _payment_svc()
                refund_res = pay_svc.refund(payment.stripe_charge_id or payment.stripe_payment_intent_id)
                refund_id = refund_res.get("id")

            pay_repo.mark_refunded(payment, refund_id=refund_id)

        return jsonify({"message": "Refund processed", "order_id": order_id, "refund_id": refund_id}), 200

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
