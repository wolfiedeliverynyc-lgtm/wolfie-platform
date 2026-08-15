"""
╔══════════════════════════════════════════════════════════════╗
║     WOLFIE DELIVERY — payment_service.py                     ║
║     Compatible with routes/payments.py + app.py             ║
╚══════════════════════════════════════════════════════════════╝
Expected interface by app.py:
    PaymentService(stripe_key, webhook_secret)
"""

import os
import logging
import stripe
from datetime import datetime, timezone

logger = logging.getLogger("wolfie")
UTC    = timezone.utc


class PaymentService:

    def __init__(self, stripe_key: str = None, webhook_secret: str = None):
        self.webhook_secret = webhook_secret or os.getenv("STRIPE_WEBHOOK_SECRET")
        key = stripe_key or os.getenv("STRIPE_SECRET_KEY")

        # Determine if Stripe should operate in real mode or mock mode
        force_mock = os.getenv("MOCK_PAYMENTS", "false").lower() in ("true", "1", "yes")
        is_valid_key = bool(
            key and 
            (key.startswith("sk_test_") or key.startswith("sk_live_")) and 
            not key.startswith("sk_test_placeholder") and 
            key != "mock"
        )

        if is_valid_key and not force_mock:
            self._mock = False
            self.stripe_key = key
            stripe.api_key = key
            logger.info(f"PaymentService: Real Stripe mode active ({'live' if key.startswith('sk_live_') else 'test'} key)")
        else:
            self._mock = True
            self.stripe_key = None
            logger.info("PaymentService: Dynamic Mock mode active (Stripe key missing or MOCK_PAYMENTS=true)")

    @property
    def is_mock(self) -> bool:
        return self._mock

    # ── Create PaymentIntent ───────────────────

    def create_intent(self, amount_dollars: float, order_id: str,
                      customer_id: str = None, restaurant_id: str = None,
                      currency: str = "usd") -> dict:
        cents = int(round(amount_dollars * 100))
        if self._mock:
            return {
                "client_secret": f"mock_secret_{order_id}",
                "id": f"pi_mock_{order_id}",
                "amount": cents,
                "currency": currency,
                "status": "requires_payment_method",
                "mock": True
            }

        intent = stripe.PaymentIntent.create(
            amount               = cents,
            currency             = currency,
            payment_method_types = ["card"],
            metadata             = {
                "order_id":      order_id,
                "customer_id":   customer_id or "",
                "restaurant_id": restaurant_id or "",
            },
            description = f"Wolfie order #{order_id[:8]}",
        )
        return {
            "client_secret": intent.client_secret,
            "id": intent.id,
            "amount": intent.amount,
            "currency": intent.currency,
            "status": intent.status,
            "mock": False
        }

    # ── Refund ────────────────────────────────

    def refund(self, payment_intent_id: str, amount_dollars: float = None,
               reason: str = "requested_by_customer") -> dict:
        if self._mock or str(payment_intent_id).startswith("pi_mock_"):
            refund_amount = amount_dollars if amount_dollars is not None else 0.0
            return {
                "id": f"re_mock_{payment_intent_id}",
                "status": "succeeded",
                "amount": refund_amount,
                "mock": True
            }

        kwargs = {"payment_intent": payment_intent_id, "reason": reason}
        if amount_dollars:
            kwargs["amount"] = int(round(amount_dollars * 100))

        refund = stripe.Refund.create(**kwargs)
        return {"id": refund.id, "status": refund.status, "amount": refund.amount / 100, "mock": False}

    # ── Verify Webhook ────────────────────────

    def verify_webhook(self, payload: bytes, sig_header: str) -> dict:
        if self._mock or not self.webhook_secret:
            import json
            try:
                data = json.loads(payload)
                return data
            except Exception:
                return {"type": "mock_event", "data": {"object": {}}}

        return stripe.Webhook.construct_event(payload, sig_header, self.webhook_secret)

    # ── Create Subscription ───────────────────

    def create_subscription(self, customer_id: str, price_id: str,
                            trial_days: int = 7) -> dict:
        if self._mock or str(customer_id).startswith("cus_mock_"):
            return {
                "id": f"sub_mock_{customer_id}",
                "status": "trialing",
                "trial_end": int(datetime.now(UTC).timestamp()) + (trial_days * 86400),
                "mock": True
            }

        sub = stripe.Subscription.create(
            customer          = customer_id,
            items             = [{"price": price_id}],
            trial_period_days = trial_days,
        )
        return {"id": sub.id, "status": sub.status, "trial_end": sub.trial_end, "mock": False}

    # ── Create Customer ───────────────────────

    def create_customer(self, email: str, name: str,
                        payment_method_id: str = None) -> dict:
        if self._mock:
            return {"id": f"cus_mock_{email}", "mock": True}

        kwargs = {"email": email, "name": name}
        if payment_method_id:
            kwargs["payment_method"]    = payment_method_id
            kwargs["invoice_settings"]  = {"default_payment_method": payment_method_id}

        customer = stripe.Customer.create(**kwargs)
        return {"id": customer.id, "mock": False}

    # ── Calculate Driver Payout ───────────────

    def calculate_driver_payout(self, distance_km: float, duration_min: float) -> float:
        """Driver payout formula"""
        return round(4.00 + 0.80 * distance_km + 0.12 * duration_min, 2)
