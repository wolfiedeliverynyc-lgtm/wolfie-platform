"""
WOLFIE DELIVERY — tests/test_orders_security_hardening.py
Unit tests to verify security fixes, authentication decorators, BOLA checks, and idempotency collision prevention.
"""

import uuid
import pytest
import jwt
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv()


def _token(user_id: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    secret = os.getenv("JWT_SECRET_KEY", "wolfie-jwt-change-in-prod")
    return jwt.encode({
        "sub": user_id,
        "role": role,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(hours=24),
        "jti": str(uuid.uuid4())
    }, secret, algorithm="HS256")


@pytest.fixture
def client():
    with patch("services.mapbox.MapboxClient"),       \
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


class TestOrdersSecurityHardening:

    VALID_PAYLOAD = {
        "restaurant_id": "rest_123",
        "items": [{"id": "item_1", "price": 10.0, "quantity": 1}],
        "pickup_address": "Addr A",
        "delivery_address": "Addr B",
        "payment_method": "cash",
        "delivery_lat": 40.7,
        "delivery_lng": -74.0,
        "pickup_lat": 40.7,
        "pickup_lng": -74.0
    }

    def test_create_order_no_token_returns_401(self, client):
        res = client.post("/api/v1/orders/", json=self.VALID_PAYLOAD)
        assert res.status_code == 401
        assert b"Missing or invalid Authorization header" in res.data

    def test_create_order_nonexistent_customer_returns_404(self, client):
        cust_id = "nonexistent_cust"
        # Mock database session to return None for customer query
        with patch("routes.orders.get_db_session") as mock_session:
            session = MagicMock()
            session.query.return_value.filter.return_value.first.side_effect = [None]
            mock_session.return_value.__enter__ = lambda s: session
            mock_session.return_value.__exit__  = MagicMock(return_value=False)

            res = client.post("/api/v1/orders/",
                              json=self.VALID_PAYLOAD,
                              headers={"Authorization": f"Bearer {_token(cust_id, 'customer')}"})
            assert res.status_code == 404
            assert b"Customer not found" in res.data

    def test_create_order_bola_mismatch_returns_403(self, client):
        cust_id = "customer_alice"
        # Attempt to create order for "customer_bob"
        payload = self.VALID_PAYLOAD.copy()
        payload["customer_id"] = "customer_bob"
        res = client.post("/api/v1/orders/",
                          json=payload,
                          headers={"Authorization": f"Bearer {_token(cust_id, 'customer')}"})
        assert res.status_code == 403
        assert b"Unauthorized: Cannot create order for another customer" in res.data

    def test_idempotency_cross_user_hijack_returns_403(self, client):
        # Setup cached idempotency key belonging to user_alice
        ik = MagicMock()
        ik.key = "shared-key"
        ik.customer_id = "user_alice"
        ik.route = "/api/v1/orders/"
        ik.request_hash = "some-hash"
        ik.response_body = {"order_id": "123"}
        ik.status_code = 201

        with patch("routes.orders.transaction") as mock_tx:
            session = MagicMock()
            session.query.return_value.filter_by.return_value.first.return_value = ik
            mock_tx.return_value.__enter__ = lambda s: session
            mock_tx.return_value.__exit__  = MagicMock(return_value=False)

            # user_bob attempts to reuse the same key
            res = client.post("/api/v1/orders/",
                              json=self.VALID_PAYLOAD,
                              headers={
                                  "Authorization": f"Bearer {_token('user_bob', 'customer')}",
                                  "Idempotency-Key": "shared-key"
                              })
            assert res.status_code == 403
            assert b"Unauthorized use of idempotency key" in res.data

    def test_idempotency_payload_collision_returns_400(self, client):
        # Setup cached key with a specific request hash
        ik = MagicMock()
        ik.key = "collision-key"
        ik.customer_id = "user_alice"
        ik.route = "/api/v1/orders/"
        ik.request_hash = "hash-A"
        ik.response_body = {"order_id": "123"}
        ik.status_code = 201

        with patch("routes.orders.transaction") as mock_tx:
            session = MagicMock()
            session.query.return_value.filter_by.return_value.first.return_value = ik
            mock_tx.return_value.__enter__ = lambda s: session
            mock_tx.return_value.__exit__  = MagicMock(return_value=False)

            # Request A with collision-key and different payload body (produces different hash)
            different_payload = self.VALID_PAYLOAD.copy()
            different_payload["restaurant_id"] = "rest_different_payload"
            res = client.post("/api/v1/orders/",
                              json=different_payload,
                              headers={
                                  "Authorization": f"Bearer {_token('user_alice', 'customer')}",
                                  "Idempotency-Key": "collision-key"
                              })
            assert res.status_code == 400
            assert b"Idempotency key collision" in res.data

    def test_idempotency_different_route_collision_returns_400(self, client):
        ik = MagicMock()
        ik.key = "route-key"
        ik.customer_id = "user_alice"
        # key was created for order status PATCH, but used for order POST
        ik.route = "/api/v1/orders/123/status"
        ik.request_hash = "some-hash"
        ik.response_body = {"status": "accepted"}
        ik.status_code = 200

        with patch("routes.orders.transaction") as mock_tx:
            session = MagicMock()
            session.query.return_value.filter_by.return_value.first.return_value = ik
            mock_tx.return_value.__enter__ = lambda s: session
            mock_tx.return_value.__exit__  = MagicMock(return_value=False)

            res = client.post("/api/v1/orders/",
                              json=self.VALID_PAYLOAD,
                              headers={
                                  "Authorization": f"Bearer {_token('user_alice', 'customer')}",
                                  "Idempotency-Key": "route-key"
                              })
            assert res.status_code == 400
            assert b"Idempotency key collision" in res.data

    def test_error_response_contains_standard_keys_on_401(self, client):
        res = client.post("/api/v1/orders/", json=self.VALID_PAYLOAD)
        assert res.status_code == 401
        data = res.get_json()
        assert "code" in data
        assert "message" in data
        assert "trace_id" in data
        assert data["code"] == "AUTH_001"
        assert data["trace_id"].startswith("req_")

    def test_error_response_contains_standard_keys_on_403(self, client):
        cust_id = "customer_alice"
        payload = self.VALID_PAYLOAD.copy()
        payload["customer_id"] = "customer_bob"
        res = client.post("/api/v1/orders/",
                          json=payload,
                          headers={"Authorization": f"Bearer {_token(cust_id, 'customer')}"})
        assert res.status_code == 403
        data = res.get_json()
        assert "code" in data
        assert "message" in data
        assert "trace_id" in data
        assert data["code"] == "AUTH_002"

    def test_error_response_contains_standard_keys_on_404(self, client):
        cust_id = "nonexistent_cust"
        with patch("routes.orders.get_db_session") as mock_session:
            session = MagicMock()
            session.query.return_value.filter.return_value.first.side_effect = [None]
            mock_session.return_value.__enter__ = lambda s: session
            mock_session.return_value.__exit__  = MagicMock(return_value=False)

            res = client.post("/api/v1/orders/",
                              json=self.VALID_PAYLOAD,
                              headers={"Authorization": f"Bearer {_token(cust_id, 'customer')}"})
            assert res.status_code == 404
            data = res.get_json()
            assert "code" in data
            assert "message" in data
            assert "trace_id" in data
            assert data["code"] == "ORDER_013"

