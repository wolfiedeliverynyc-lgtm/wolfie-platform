"""
Unit tests for production readiness hardening features in Wolfie.
"""
import pytest
import jwt
import os
import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
from database import transaction
from database.schemas import User, Order
from database.repositories import UserRepository, OrderRepository


def _generate_test_token(user_id: str, role: str) -> str:
    secret = os.getenv("JWT_SECRET_KEY", "wolfie-jwt-change-in-prod")
    return jwt.encode({
        "sub": user_id,
        "role": role,
        "type": "access",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
    }, secret, algorithm="HS256")


def test_prevent_user_deletion_with_active_orders(app):
    with app.app_context():
        uid = str(uuid.uuid4())[:8]
        email = f"delete_test_{uid}@test.com"
        
        with transaction() as session:
            # Create restaurant user to satisfy foreign key constraint
            restaurant = User(
                id="rest_123",
                email=f"rest_{uid}@test.com",
                password_hash="none",
                full_name="Test Restaurant",
                phone="000000",
                role="restaurant",
                is_active=True
            )
            session.merge(restaurant)
            session.flush()

            # Create customer
            customer = User(
                id=f"cst_{uid}",
                email=email,
                password_hash="none",
                full_name="Delete Test Customer",
                phone="0000000",
                role="customer",
                is_active=True
            )
            session.add(customer)
            session.flush()
            
            # Create active order
            order = Order(
                id=f"ord_{uid}",
                customer_id=customer.id,
                restaurant_id="rest_123",
                status="pending",
                pickup_address="A",
                delivery_address="B",
                items=[{"name": "test", "price": 10.0, "quantity": 1}],
                subtotal=10.0,
                total=10.0,
                payment_method="stripe"
            )
            session.add(order)
            session.flush()
            
            # Attempt to delete customer while order is active
            repo = UserRepository(session)
            with pytest.raises(ValueError) as excinfo:
                repo.delete(customer)
            assert "Cannot delete account with active orders" in str(excinfo.value)
            
            # Now set order to final state (delivered) with timestamp to pass check constraint
            order.status = "delivered"
            order.delivered_at = datetime.now(timezone.utc)
            session.flush()
            
            # Deletion should succeed now (sets is_active to False - soft delete)
            repo.delete(customer)
            assert customer.is_active is False


def test_sql_pagination_endpoints(client):
    rest_token = _generate_test_token("rest_123", "restaurant")
    driver_token = _generate_test_token("drv_123", "driver")

    with patch("routes.restaurants.OrderRepository") as mock_order_repo:
        mock_order_repo.return_value.find_by_restaurant.return_value = []
        
        res = client.get("/api/v1/restaurants/orders?limit=5&offset=10&status=pending",
                         headers={"Authorization": f"Bearer {rest_token}"})
        assert res.status_code == 200
        mock_order_repo.return_value.find_by_restaurant.assert_called_with(
            "rest_123", limit=5, offset=10, status="pending"
        )

    with patch("routes.drivers.OrderRepository") as mock_order_repo:
        mock_order_repo.return_value.find_by_driver.return_value = []
        
        res = client.get("/api/v1/drivers/orders/history?limit=3&offset=6&status=delivered",
                         headers={"Authorization": f"Bearer {driver_token}"})
        assert res.status_code == 200
        mock_order_repo.return_value.find_by_driver.assert_called_with(
            "drv_123", status="delivered", limit=3, offset=6
        )


def test_location_update_endpoint_role_hardening(client):
    cust_token = _generate_test_token("cust_123", "customer")
    drv_token_1 = _generate_test_token("drv_1", "driver")
    drv_token_2 = _generate_test_token("drv_2", "driver")
    admin_token = _generate_test_token("admin_1", "admin")

    # 1. Customer tries to update location -> should be blocked by role check (403 or 401)
    res = client.post("/api/v1/drivers/drv_1/location", json={"lat": 40.0, "lng": -73.0},
                      headers={"Authorization": f"Bearer {cust_token}"})
    assert res.status_code in [401, 403]

    # 2. Driver 1 tries to update Driver 2's location -> should return 403
    res = client.post("/api/v1/drivers/drv_2/location", json={"lat": 40.0, "lng": -73.0},
                      headers={"Authorization": f"Bearer {drv_token_1}"})
    assert res.status_code == 403
    assert b"Cannot update another driver's location" in res.data

    # 3. Driver 1 updates their own location -> should succeed
    with patch("routes.drivers.driver_service") as mock_service:
        mock_service.update_location_by_id.return_value = {"status": "success"}
        res = client.post("/api/v1/drivers/drv_1/location", json={"lat": 40.0, "lng": -73.0},
                          headers={"Authorization": f"Bearer {drv_token_1}"})
        assert res.status_code == 200
        mock_service.update_location_by_id.assert_called_with("drv_1", 40.0, -73.0, None, None)

    # 4. Admin updates Driver 1's location -> should succeed
    with patch("routes.drivers.driver_service") as mock_service:
        mock_service.update_location_by_id.return_value = {"status": "success"}
        res = client.post("/api/v1/drivers/drv_1/location", json={"lat": 41.0, "lng": -72.0},
                          headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200
        mock_service.update_location_by_id.assert_called_with("drv_1", 41.0, -72.0, None, None)
