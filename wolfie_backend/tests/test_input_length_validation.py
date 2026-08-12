"""
Unit tests for input length validations in Wolfie delivery system.
"""
import pytest
import jwt
import os
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock


def _generate_test_token(user_id: str, role: str) -> str:
    secret = os.getenv("JWT_SECRET_KEY", "wolfie-jwt-change-in-prod")
    return jwt.encode({
        "sub": user_id,
        "role": role,
        "type": "access",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
    }, secret, algorithm="HS256")


def test_restaurant_name_length_limit(client):
    # 121 character restaurant name
    long_name = "A" * 121
    res = client.post("/api/v1/restaurants/register", json={
        "email": "length_test@restaurant.com",
        "password": "Password123!",
        "full_name": "Test Owner",
        "phone": "1234567890",
        "restaurant_name": long_name
    })
    assert res.status_code == 400
    assert b"Restaurant Name must be 120 characters or less" in res.data


def test_update_profile_restaurant_name_limit(client):
    token = _generate_test_token("rest_test_id", "restaurant")
    long_name = "A" * 121
    res = client.patch("/api/v1/restaurants/profile", json={
        "restaurant_name": long_name
    }, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 400
    assert b"Restaurant Name must be 120 characters or less" in res.data


def test_menu_description_length_limit(client):
    token = _generate_test_token("rest_test_id", "restaurant")
    long_desc = "D" * 2001
    
    # Try POST /menu
    res = client.post("/api/v1/restaurants/menu", json={
        "name": "Burger",
        "price": 9.99,
        "category": "Food",
        "description": long_desc
    }, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 400
    assert b"Menu Description must be 2000 characters or less" in res.data

    # Try PATCH /menu/item_id
    res = client.patch("/api/v1/restaurants/menu/item_123", json={
        "description": long_desc
    }, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 400
    assert b"Menu Description must be 2000 characters or less" in res.data


def test_address_notes_length_limit(client):
    token = _generate_test_token("cust_test_id", "customer")
    long_notes = "N" * 501

    # Try POST /addresses
    res = client.post("/api/v1/addresses", json={
        "street": "123 Main St",
        "city": "NYC",
        "notes": long_notes
    }, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 400
    assert b"Notes must be 500 characters or less" in res.data

    # Try PUT /addresses/addr_123 with mock session
    with patch("routes.addresses.transaction") as mock_tx:
        session = MagicMock()
        mock_addr = MagicMock()
        session.query.return_value.filter.return_value.first.return_value = mock_addr
        mock_tx.return_value.__enter__ = lambda s: session
        mock_tx.return_value.__exit__  = MagicMock(return_value=False)

        res = client.put("/api/v1/addresses/addr_123", json={
            "notes": long_notes
        }, headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 400
        assert b"Notes must be 500 characters or less" in res.data


def test_review_comment_length_limit(client):
    # Setup mock order for customer rating
    token = _generate_test_token("cust_test_id", "customer")
    long_comment = "C" * 1001

    with patch("routes.ratings.OrderRepository") as mock_order_repo:
        mock_order = MagicMock()
        mock_order.customer_id = "cust_test_id"
        mock_order.status = "delivered"
        mock_order.driver_id = "drv_123"
        mock_order.restaurant_id = "rest_123"
        mock_order_repo.return_value.get.return_value = mock_order

        # Try POST /submit
        res = client.post("/api/v1/ratings/submit", json={
            "order_id": "ord_123",
            "driver_rating": 5,
            "comment": long_comment
        }, headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 400
        assert b"Comment must be 1000 characters or less" in res.data
