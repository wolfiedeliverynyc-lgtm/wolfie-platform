"""
╔══════════════════════════════════════════════════════════════╗
║     WOLFIE DELIVERY — payment_service.py                     ║
║     Compatible with routes/payments.py + app.py             ║
╚══════════════════════════════════════════════════════════════╝
Expected interface by app.py:
    PaymentService(stripe_key, webhook_secret)
"""

import logging
import stripe
from datetime import datetime, timezone

logger = logging.getLogger("wolfie")
UTC    = timezone.utc


class PaymentService:

    def __init__(self, stripe_key: str, webhook_secret: str):
        self.webhook_secret = webhook_secret
        if stripe_key:
            stripe.api_key = stripe_key
            logger.info("PaymentService: Stripe configured")
        else:
            logger.warning("PaymentService: No Stripe key — running in mock mode")
        self._mock = not bool(stripe_key)

    # ── Create PaymentIntent ───────────────────

    def create_intent(self, amount_dollars: float, order_id: str,
                      customer_id: str = None, restaurant_id: str = None) -> dict:
        if self._mock:
            return {"client_secret": f"mock_secret_{order_id}", "id": f"pi_mock_{order_id}"}

        cents  = int(round(amount_dollars * 100))
        intent = stripe.PaymentIntent.create(
            amount               = cents,
            currency             = "usd",
            payment_method_types = ["card"],
            metadata             = {
                "order_id":      order_id,
                "customer_id":   customer_id or "",
                "restaurant_id": restaurant_id or "",
            },
            description = f"Wolfie order #{order_id[:8]}",
        )
        return {"client_secret": intent.client_secret, "id": intent.id}

    # ── Refund ────────────────────────────────

    def refund(self, payment_intent_id: str, amount_dollars: float = None,
               reason: str = "requested_by_customer") -> dict:
        if self._mock:
            return {"id": f"re_mock_{payment_intent_id}", "status": "succeeded"}

        kwargs = {"payment_intent": payment_intent_id, "reason": reason}
        if amount_dollars:
            kwargs["amount"] = int(round(amount_dollars * 100))

        refund = stripe.Refund.create(**kwargs)
        return {"id": refund.id, "status": refund.status, "amount": refund.amount / 100}

    # ── Verify Webhook ────────────────────────

    def verify_webhook(self, payload: bytes, sig_header: str) -> dict:
        return stripe.Webhook.construct_event(payload, sig_header, self.webhook_secret)

    # ── Create Subscription ───────────────────

    def create_subscription(self, customer_id: str, price_id: str,
                            trial_days: int = 7) -> dict:
        if self._mock:
            return {"id": f"sub_mock_{customer_id}", "status": "trialing"}

        sub = stripe.Subscription.create(
            customer          = customer_id,
            items             = [{"price": price_id}],
            trial_period_days = trial_days,
        )
        return {"id": sub.id, "status": sub.status, "trial_end": sub.trial_end}

    # ── Create Customer ───────────────────────

    def create_customer(self, email: str, name: str,
                        payment_method_id: str = None) -> dict:
        if self._mock:
            return {"id": f"cus_mock_{email}"}

        kwargs = {"email": email, "name": name}
        if payment_method_id:
            kwargs["payment_method"]    = payment_method_id
            kwargs["invoice_settings"]  = {"default_payment_method": payment_method_id}

        customer = stripe.Customer.create(**kwargs)
        return {"id": customer.id}

    # ── Calculate Driver Payout ───────────────

    def calculate_driver_payout(self, distance_km: float, duration_min: float) -> float:
        """v5.7 driver payout formula"""
        return round(4.00 + 0.80 * distance_km + 0.12 * duration_min, 2)
