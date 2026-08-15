"""
WOLFIE DELIVERY — tests/test_security_bolas.py
Tests to verify BOLA/IDOR security fixes on orders, history, and tracking.
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


# ── App fixture ───────────────────────────────────────────────────────────────

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


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestSecurityBolas:

    def test_customer_cannot_view_other_order(self, client):
        order_id = str(uuid.uuid4())
        order = MagicMock()
        order.id = order_id
        order.customer_id = "customer_owner"
        order.driver_id = "drv_001"
        order.restaurant_id = "rest_001"

        # Mock database session and order repository
        with patch("routes.orders.get_db_session") as mock_session:
            session = MagicMock()
            mock_session.return_value.__enter__ = lambda s: session
            mock_session.return_value.__exit__  = MagicMock(return_value=False)

            with patch("routes.orders.OrderRepository") as mock_repo:
                mock_repo.return_value.get.return_value = order
                mock_repo.return_value.to_dict.return_value = {"id": order_id}

                # 1. Customer who owns the order can access
                res1 = client.get(f"/api/v1/orders/{order_id}",
                                  headers={"Authorization": f"Bearer {_token('customer_owner', 'customer')}"})
                assert res1.status_code == 200

                # 2. Random customer cannot access (returns 403)
                res2 = client.get(f"/api/v1/orders/{order_id}",
                                  headers={"Authorization": f"Bearer {_token('customer_attacker', 'customer')}"})
                assert res2.status_code == 403

    def test_customer_cannot_view_other_history(self, client):
        # 1. Accessing own history is allowed
        res1 = client.get("/api/v1/orders/customer/cst_001",
                          headers={"Authorization": f"Bearer {_token('cst_001', 'customer')}"})
        assert res1.status_code == 200

        # 2. Accessing another customer's history is forbidden
        res2 = client.get("/api/v1/orders/customer/cst_other",
                          headers={"Authorization": f"Bearer {_token('cst_001', 'customer')}"})
        assert res2.status_code == 403

    def test_customer_cannot_track_other_order(self, client):
        order_id = str(uuid.uuid4())
        order = MagicMock()
        order.id = order_id
        order.customer_id = "customer_owner"
        order.driver_id = "drv_assigned"
        order.status = "riding"
        order.pickup_address = "456 Diner Rd"
        order.delivery_address = "123 Alpha St"
        order.created_at = None
        order.picked_up_at = None
        order.delivered_at = None
        order.eta_minutes = 15

        with patch("routes.tracking.get_db_session") as mock_session:
            session = MagicMock()
            mock_session.return_value.__enter__ = lambda s: session
            mock_session.return_value.__exit__  = MagicMock(return_value=False)

            with patch("routes.tracking.OrderRepository") as mock_repo, \
                 patch("routes.tracking.DriverLocationRepository") as mock_loc_repo:
                mock_repo.return_value.get.return_value = order
                mock_loc_repo.return_value.get_for_driver.return_value = None

                # 1. Associated customer can track
                res1 = client.get(f"/api/v1/tracking/{order_id}",
                                  headers={"Authorization": f"Bearer {_token('customer_owner', 'customer')}"})
                assert res1.status_code == 200

                # 2. Random customer cannot track
                res2 = client.get(f"/api/v1/tracking/{order_id}",
                                  headers={"Authorization": f"Bearer {_token('customer_attacker', 'customer')}"})
                assert res2.status_code == 403

    def test_restaurant_cannot_update_other_order(self, client):
        order_id = str(uuid.uuid4())
        order = MagicMock()
        order.id = order_id
        order.customer_id = "cst_001"
        order.driver_id = "drv_001"
        order.restaurant_id = "restaurant_owner"
        order.status = "preparing"

        with patch("routes.orders.transaction") as mock_tx:
            session = MagicMock()
            mock_tx.return_value.__enter__ = lambda s: session
            mock_tx.return_value.__exit__  = MagicMock(return_value=False)

            with patch("routes.orders.OrderRepository") as mock_repo:
                mock_repo.return_value.get_or_404.return_value = order
                mock_repo.return_value.get_or_404_for_update.return_value = order

                # 1. Restaurant owner can update
                # (Mock transition execution to avoid actual state-machine validation here)
                mock_repo.return_value.transition.return_value = (order, [])
                res1 = client.patch(f"/api/v1/orders/{order_id}/status",
                                    json={"status": "ready"},
                                    headers={"Authorization": f"Bearer {_token('restaurant_owner', 'restaurant')}"})
                assert res1.status_code == 200

                # 2. Random restaurant cannot update (returns 403)
                res2 = client.patch(f"/api/v1/orders/{order_id}/status",
                                    json={"status": "ready"},
                                    headers={"Authorization": f"Bearer {_token('restaurant_attacker', 'restaurant')}"})
                assert res2.status_code == 403

    def test_order_creation_pricing_and_availability_checks(self, client):
        rest_id = "rest_001"
        cust_id = "cust_001"
        
        # 1. Closed restaurant should return 400
        mock_restaurant = MagicMock()
        mock_restaurant.id = rest_id
        mock_restaurant.role = "restaurant"
        mock_restaurant.is_active = True
        mock_restaurant.is_open = False # CLOSED!

        with patch("routes.orders.get_db_session") as mock_session:
            session = MagicMock()
            mock_session.return_value.__enter__ = lambda s: session
            mock_session.return_value.__exit__  = MagicMock(return_value=False)
            
            session.query.return_value.filter.return_value.first.return_value = mock_restaurant
            
            res = client.post("/api/v1/orders/",
                              json={
                                  "customer_id": cust_id,
                                  "restaurant_id": rest_id,
                                  "items": [{"id": "item_001", "name": "Burger", "price": 1.0, "quantity": 1}],
                                  "pickup_address": "456 Diner Rd",
                                  "delivery_address": "123 Alpha St",
                                  "payment_method": "cash",
                                  "delivery_lat": 40.7128,
                                  "delivery_lng": -74.0060,
                                  "pickup_lat": 40.7128,
                                  "pickup_lng": -74.0060
                              },
                              headers={"Authorization": f"Bearer {_token(cust_id, 'customer')}"})
            
            assert res.status_code == 400
            assert b"Restaurant is closed" in res.data

        # 2. Pricing tampering bypass protection (corrects price to DB value)
        mock_restaurant.is_open = True # OPEN!
        
        mock_item = MagicMock()
        mock_item.id = "item_001"
        mock_item.name = "Burger"
        mock_item.price = 15.0 # Real price is $15.0
        mock_item.is_available = True

        with patch("routes.orders.get_db_session") as mock_session:
            session = MagicMock()
            mock_session.return_value.__enter__ = lambda s: session
            mock_session.return_value.__exit__  = MagicMock(return_value=False)
            
            def mock_query(model):
                q = MagicMock()
                if model.__name__ == "User":
                    q.filter.return_value.first.return_value = mock_restaurant
                elif model.__name__ == "MenuItem":
                    q.filter.return_value.first.return_value = mock_item
                return q
            
            session.query.side_effect = mock_query
            
            with patch("routes.orders.OrderRepository") as mock_repo, \
                 patch("routes.orders._calc_pricing") as mock_calc:
                
                mock_order = MagicMock()
                mock_order.id = "order_12345"
                mock_order.status = "pending"
                mock_repo.return_value.create.return_value = mock_order
                
                mock_calc.return_value = {
                    "subtotal": 15.0,
                    "delivery_fee": 3.99,
                    "service_fee": 1.99,
                    "tax": 1.33,
                    "restaurant_commission": 2.25,
                    "driver_payout": 4.50,
                    "total": 22.31,
                    "source": "mock"
                }
                
                res = client.post("/api/v1/orders/",
                                  json={
                                      "customer_id": cust_id,
                                      "restaurant_id": rest_id,
                                      "items": [{"id": "item_001", "name": "Burger", "price": 1.0, "quantity": 1}], # Tampered/Spoofed price!
                                      "pickup_address": "456 Diner Rd",
                                      "delivery_address": "123 Alpha St",
                                      "payment_method": "cash",
                                      "delivery_lat": 40.7128,
                                      "delivery_lng": -74.0060,
                                      "pickup_lat": 40.7128,
                                      "pickup_lng": -74.0060
                                  },
                                  headers={"Authorization": f"Bearer {_token(cust_id, 'customer')}"})
                
                assert res.status_code == 201
                # Verify that the pricing engine calculation was invoked with the corrected DB subtotal
                mock_calc.assert_called_once()
                called_subtotal = mock_calc.call_args[0][1]
                assert called_subtotal == 15.0
