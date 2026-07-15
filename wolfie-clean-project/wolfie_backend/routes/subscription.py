"""
╔══════════════════════════════════════════════════════════════╗
║   WOLFIE DELIVERY — routes/subscription.py (v3 — Repos)     ║
╚══════════════════════════════════════════════════════════════╝
"""

import logging
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, current_app
from routes.auth import require_auth
from database import transaction, get_db_session
from database.repositories import UserRepository

subscription_bp = Blueprint("subscription", __name__)
logger          = logging.getLogger("wolfie")
UTC             = timezone.utc

PLANS = {
    "weekly":  {"price": 29.99, "days": 7,  "stripe_price_id": "price_weekly"},
    "monthly": {"price": 99.99, "days": 30, "stripe_price_id": "price_monthly"},
}


def _stripe():
    import stripe
    stripe.api_key = current_app.config.get("STRIPE_SECRET_KEY")
    return stripe


@subscription_bp.route("/status", methods=["GET"])
@require_auth(["driver"])
def get_subscription_status():
    with get_db_session() as session:
        repo = UserRepository(session)
        user = repo.get_or_404(request.user_id)
        now  = datetime.now(UTC)
        trial_ends = user.trial_ends_at
        trial_active = trial_ends and trial_ends.replace(tzinfo=UTC) > now if trial_ends else False

        return jsonify({
            "user_id":             user.id,
            "subscription_status": user.subscription_status,
            "trial_ends_at":       trial_ends.isoformat() if trial_ends else None,
            "trial_active":        trial_active,
            "is_active":           user.is_active,
        }), 200


@subscription_bp.route("/subscribe", methods=["POST"])
@require_auth(["driver"])
def subscribe():
    data    = request.get_json(silent=True) or {}
    plan    = data.get("plan", "monthly")
    pm_id   = data.get("payment_method_id")

    if plan not in PLANS:
        return jsonify({"error": f"Invalid plan. Choose: {list(PLANS.keys())}"}), 400
    if not pm_id:
        return jsonify({"error": "payment_method_id required"}), 400

    plan_info = PLANS[plan]

    try:
        with get_db_session() as session:
            repo = UserRepository(session)
            user = repo.get_or_404(request.user_id)
            email = user.email

        s = _stripe()

        # Get or create Stripe customer
        customers = s.Customer.list(email=email, limit=1)
        if customers.data:
            customer = customers.data[0]
        else:
            customer = s.Customer.create(email=email)

        s.PaymentMethod.attach(pm_id, customer=customer.id)
        s.Customer.modify(customer.id,
                          invoice_settings={"default_payment_method": pm_id})

        subscription = s.Subscription.create(
            customer    = customer.id,
            items       = [{"price": plan_info["stripe_price_id"]}],
            expand      = ["latest_invoice.payment_intent"],
        )

        expiry = datetime.now(UTC) + timedelta(days=plan_info["days"])

        with transaction() as session:
            repo = UserRepository(session)
            user = repo.get_or_404(request.user_id)
            repo.update(user,
                        subscription_status    = "active",
                        trial_ends_at          = expiry,
                        stripe_subscription_id = subscription.id)

        return jsonify({
            "message":         f"{plan} subscription activated",
            "subscription_id": subscription.id,
            "expires_at":      expiry.isoformat(),
        }), 200

    except LookupError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        logger.error(f"subscribe: {e}")
        return jsonify({"error": str(e)}), 500


@subscription_bp.route("/cancel", methods=["POST"])
@require_auth(["driver"])
def cancel_subscription():
    try:
        with get_db_session() as session:
            repo = UserRepository(session)
            user = repo.get_or_404(request.user_id)
            sub_id = getattr(user, "stripe_subscription_id", None)

        if sub_id:
            s = _stripe()
            s.Subscription.cancel(sub_id)

        with transaction() as session:
            repo = UserRepository(session)
            user = repo.get_or_404(request.user_id)
            repo.update(user, subscription_status="cancelled",
                        stripe_subscription_id=None)

        return jsonify({"message": "Subscription cancelled"}), 200

    except LookupError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        logger.error(f"cancel_subscription: {e}")
        return jsonify({"error": str(e)}), 500


@subscription_bp.route("/admin/list", methods=["GET"])
@require_auth(["admin"])
def list_subscriptions():
    status = request.args.get("status")
    with get_db_session() as session:
        repo    = UserRepository(session)
        drivers = repo.find_by_role("driver")
        if status:
            drivers = [d for d in drivers if d.subscription_status == status]
        return jsonify({
            "subscriptions": [
                {
                    "user_id":             d.id,
                    "email":               d.email,
                    "subscription_status": d.subscription_status,
                    "trial_ends_at":       d.trial_ends_at.isoformat() if d.trial_ends_at else None,
                }
                for d in drivers
            ],
            "count": len(drivers),
        }), 200


@subscription_bp.route("/admin/expire-trials", methods=["POST"])
@require_auth(["admin"])
def expire_trials():
    now     = datetime.now(UTC)
    expired = 0
    with get_db_session() as session:
        repo    = UserRepository(session)
        drivers = repo.find_by_role("driver")
        for d in drivers:
            if (d.subscription_status == "trial"
                    and d.trial_ends_at
                    and d.trial_ends_at.replace(tzinfo=UTC) < now):
                with transaction() as s2:
                    r2   = UserRepository(s2)
                    user = r2.get(d.id)
                    r2.update(user, subscription_status="expired", is_available=False)
                expired += 1

    logger.info(f"Admin expired {expired} trials")
    return jsonify({"message": f"{expired} trial(s) expired"}), 200
