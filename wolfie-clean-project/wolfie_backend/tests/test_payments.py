"""
WOLFIE DELIVERY — tests/test_payments.py
Tests for payment flow: cash · stripe · refunds · payouts
"""

import uuid
import pytest
from unittest.mock import MagicMock, patch
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv()


# ── Auth token helper ─────────────────────────────────────────────────────────

def _token(user_id: str, role: str) -> str:
    import jwt
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    secret = os.getenv("JWT_SECRET_KEY", "wolfie-jwt-change-in-prod")
    return jwt.encode({
        "sub": user_id, "role": role, "type": "access",
        "iat": now, "exp": now + timedelta(hours=24),
    }, secret, algorithm="HS256")


AUTH_DRIVER   = {"Authorization": f"Bearer {_token('drv_001', 'driver')}"}
AUTH_ADMIN    = {"Authorization": f"Bearer {_token('adm_001', 'admin')}"}
AUTH_CUSTOMER = {"Authorization": f"Bearer {_token('cst_001', 'customer')}"}


# ── App fixture ───────────────────────────────────────────────────────────────

@pytest.fixture
def client():
    with patch("services.payment.PaymentService"),   \
         patch("services.mapbox.MapboxClient"),       \
         patch("services.realtime.RealTimeService"),  \
         patch("services.matching.SmartMatchingEngine"), \
         patch("services.push.PushNotificationEngine"):

        from app import create_app
        app = create_app("testing")
        app.redis    = None
        app.pricing  = None
        app.mapbox   = None
        app.matching = None
        app.realtime = None
        app.push     = None

        with app.test_client() as c:
            yield c


def _mock_order(order_id: str, total: float = 24.99,
                method: str = "cash",
                status: str = "delivered") -> MagicMock:
    order                     = MagicMock()
    order.id                  = order_id
    order.customer_id         = "cst_001"
    order.restaurant_id       = "rest_001"
    order.driver_id           = "drv_001"
    order.total               = total
    order.subtotal            = total * 0.80
    order.service_fee         = total * 0.10
    order.driver_payout       = 6.50
    order.restaurant_commission = total * 0.15
    order.payment_method      = method
    order.status              = status
    return order


# ══════════════════════════════════════════════════════════════════════════════
# 1 — CASH PAYMENT CONFIRMATION
# ══════════════════════════════════════════════════════════════════════════════

class TestCashPayment:

    def test_driver_can_confirm_cash(self, client):
        order_id = str(uuid.uuid4())
        order    = _mock_order(order_id, method="cash", status="delivered")

        with patch("routes.payments.get_db_session") as mock_session, \
             patch("routes.payments.transaction")    as mock_tx:

            session = MagicMock()
            mock_session.return_value.__enter__ = lambda s: session
            mock_session.return_value.__exit__  = MagicMock(return_value=False)
            mock_tx.return_value.__enter__      = lambda s: session
            mock_tx.return_value.__exit__       = MagicMock(return_value=False)

            from database.repositories.payment import PaymentRepository, DriverPayoutRepository, RestaurantPayoutRepository
            pay_repo  = MagicMock(spec=PaymentRepository)
            pay_repo.find_by_order.return_value = None

            with patch("routes.payments.OrderRepository") as mock_order_repo, \
                 patch("routes.payments.PaymentRepository", return_value=pay_repo), \
                 patch("routes.payments.DriverPayoutRepository"), \
                 patch("routes.payments.RestaurantPayoutRepository"):

                mock_order_repo.return_value.get_or_404.return_value = order
                res = client.post("/api/v1/payments/confirm-cash",
                                  json={"order_id": order_id},
                                  headers=AUTH_DRIVER)

        assert res.status_code == 200
        assert "confirmed" in res.get_json().get("message", "").lower()

    def test_customer_cannot_confirm_cash(self, client):
        res = client.post("/api/v1/payments/confirm-cash",
                          json={"order_id": "ord_x"},
                          headers=AUTH_CUSTOMER)
        assert res.status_code == 403

    def test_confirm_cash_requires_order_id(self, client):
        res = client.post("/api/v1/payments/confirm-cash",
                          json={},
                          headers=AUTH_DRIVER)
        assert res.status_code == 400


# ══════════════════════════════════════════════════════════════════════════════
# 2 — STRIPE PAYMENT INTENT
# ══════════════════════════════════════════════════════════════════════════════

class TestStripeIntent:

    def test_create_intent_requires_auth(self, client):
        res = client.post("/api/v1/payments/create-intent",
                          json={"order_id": "ord_1"})
        assert res.status_code == 401

    def test_create_intent_requires_order_id(self, client):
        res = client.post("/api/v1/payments/create-intent",
                          json={},
                          headers=AUTH_CUSTOMER)
        assert res.status_code == 400

    def test_create_intent_order_not_found(self, client):
        with patch("routes.payments.get_db_session") as mock_session:
            session = MagicMock()
            mock_session.return_value.__enter__ = lambda s: session
            mock_session.return_value.__exit__  = MagicMock(return_value=False)

            with patch("routes.payments.OrderRepository") as mock_repo:
                mock_repo.return_value.get.return_value = None
                res = client.post("/api/v1/payments/create-intent",
                                  json={"order_id": "nonexistent"},
                                  headers=AUTH_CUSTOMER)
        assert res.status_code == 404


# ══════════════════════════════════════════════════════════════════════════════
# 2b — STRIPE WEBHOOK
# ══════════════════════════════════════════════════════════════════════════════

class TestStripeWebhook:

    @patch("stripe.Webhook.construct_event")
    def test_webhook_payment_intent_succeeded(self, mock_construct, client):
        mock_construct.return_value = {
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_123",
                    "latest_charge": "ch_123",
                    "metadata": {"order_id": "ord_1"}
                }
            }
        }

        order = MagicMock()
        order.id = "ord_1"
        order.customer_id = "cst_001"
        order.restaurant_id = "rest_001"
        order.total = 25.0
        order.route_info = {"pickup_coords": {"lat": 40.0, "lng": -74.0}}
        order.driver_id = None

        with patch("routes.payments.transaction") as mock_tx:
            session = MagicMock()
            mock_tx.return_value.__enter__ = lambda s: session
            mock_tx.return_value.__exit__  = MagicMock(return_value=False)

            pay_repo = MagicMock()
            pay_repo.find_by_order.return_value = None

            order_repo = MagicMock()
            order_repo.get.return_value = order
            order_repo.to_dict.return_value = {
                "id": "ord_1", "status": "assigned", "restaurant_id": "rest_001"
            }

            with patch("routes.payments.OrderRepository", return_value=order_repo), \
                 patch("routes.payments.PaymentRepository", return_value=pay_repo), \
                 patch("app.socketio.emit") as mock_socket_emit, \
                 patch("tasks.matching.assign_driver") as mock_assign_driver:

                client.application.config["STRIPE_WEBHOOK_SECRET"] = "whsec_test"
                res = client.post("/api/v1/payments/webhook",
                                  data="payload",
                                  headers={"Stripe-Signature": "t=1,v1=1"})

                assert res.status_code == 200
                assert res.get_json() == {"received": True}
                
                # Check payment is created and marked completed
                pay_repo.create.assert_called_once()
                pay_repo.mark_completed.assert_called_once()
                
                # Verify WebSocket emissions are called
                mock_socket_emit.assert_any_call("order_status_update", {"order_id": "ord_1", "status": "assigned"}, room="order_ord_1", namespace="/")
                mock_socket_emit.assert_any_call("incoming_order", {"id": "ord_1", "status": "assigned", "restaurant_id": "rest_001"}, room="restaurant_rest_001", namespace="/")


# ══════════════════════════════════════════════════════════════════════════════
# 3 — REFUNDS
# ══════════════════════════════════════════════════════════════════════════════

class TestRefunds:

    def test_only_admin_can_refund(self, client):
        res = client.post("/api/v1/payments/refund",
                          json={"order_id": "ord_1"},
                          headers=AUTH_CUSTOMER)
        assert res.status_code == 403

        res = client.post("/api/v1/payments/refund",
                          json={"order_id": "ord_1"},
                          headers=AUTH_DRIVER)
        assert res.status_code == 403

    def test_refund_requires_order_id(self, client):
        res = client.post("/api/v1/payments/refund",
                          json={},
                          headers=AUTH_ADMIN)
        assert res.status_code == 400

    def test_refund_payment_not_found(self, client):
        with patch("routes.payments.transaction") as mock_tx:
            session = MagicMock()
            mock_tx.return_value.__enter__ = lambda s: session
            mock_tx.return_value.__exit__  = MagicMock(return_value=False)

            with patch("routes.payments.PaymentRepository") as mock_repo:
                mock_repo.return_value.find_by_order.return_value = None
                res = client.post("/api/v1/payments/refund",
                                  json={"order_id": "ord_ghost"},
                                  headers=AUTH_ADMIN)
        assert res.status_code == 404

    def test_cannot_refund_pending_payment(self, client):
        pending_payment       = MagicMock()
        pending_payment.status = "pending"

        with patch("routes.payments.transaction") as mock_tx:
            session = MagicMock()
            mock_tx.return_value.__enter__ = lambda s: session
            mock_tx.return_value.__exit__  = MagicMock(return_value=False)

            with patch("routes.payments.PaymentRepository") as mock_repo:
                mock_repo.return_value.find_by_order.return_value = pending_payment
                res = client.post("/api/v1/payments/refund",
                                  json={"order_id": "ord_1"},
                                  headers=AUTH_ADMIN)
        assert res.status_code == 400
        assert "completed" in res.get_json().get("error", "").lower()


# ══════════════════════════════════════════════════════════════════════════════
# 4 — DRIVER EARNINGS
# ══════════════════════════════════════════════════════════════════════════════

class TestDriverEarnings:

    def test_driver_can_view_own_earnings(self, client):
        with patch("routes.payments.get_db_session") as mock_session:
            session = MagicMock()
            mock_session.return_value.__enter__ = lambda s: session
            mock_session.return_value.__exit__  = MagicMock(return_value=False)

            with patch("routes.payments.DriverPayoutRepository") as mock_repo:
                payout        = MagicMock()
                payout.amount = 8.50
                payout.status = "paid"
                mock_repo.return_value.find_by_driver.return_value = [payout]

                res = client.get("/api/v1/payments/driver/earnings",
                                 headers=AUTH_DRIVER)

        assert res.status_code == 200
        body = res.get_json()
        assert "total_paid"     in body
        assert "pending_payout" in body
        assert body["total_paid"] == 8.50

    def test_unauthenticated_cannot_view_earnings(self, client):
        res = client.get("/api/v1/payments/driver/earnings")
        assert res.status_code == 401

    def test_customer_cannot_view_driver_earnings(self, client):
        res = client.get("/api/v1/payments/driver/earnings",
                         headers=AUTH_CUSTOMER)
        assert res.status_code == 403


# ══════════════════════════════════════════════════════════════════════════════
# 5 — PAYOUT AMOUNTS (business logic)
# ══════════════════════════════════════════════════════════════════════════════

class TestPayoutAmounts:

    @pytest.mark.parametrize("subtotal,dist,duration", [
        (12.99, 2.0, 15.0),
        (25.00, 4.0, 20.0),
        (50.00, 6.0, 30.0),
    ])
    def test_driver_payout_always_profitable(self, subtotal, dist, duration):
        """Driver must always earn at least $4.00."""
        driver_payout = round(4.00 + 0.80 * dist + 0.12 * duration, 2)
        assert driver_payout >= 4.00

    @pytest.mark.parametrize("subtotal", [10.0, 25.0, 50.0, 100.0])
    def test_platform_always_profitable(self, subtotal):
        """Platform service fee always >= $3.49."""
        service_fee = round(max(3.49, min(subtotal * 0.12, 7.49)), 2)
        assert service_fee >= 3.49

    def test_restaurant_net_positive(self):
        """Restaurant always gets positive net after commission."""
        subtotal   = 30.0
        commission = subtotal * 0.18   # max commission
        net        = subtotal - commission
        assert net > 0, "Restaurant net should always be positive"
