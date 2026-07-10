import requests

BASE_URL = "http://localhost:5000"
TIMEOUT = 30
AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LWN1c3QtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMiIsInJvbGUiOiJjdXN0b21lciIsImlhdCI6MTc4MzU5NDM1OSwiZXhwIjoxNzg2MTg2MzU5LCJ0eXBlIjoiYWNjZXNzIn0.i2TQroUUBsEMo80V_HraBriCFj9srvvRRl-pJpz9FBU"
HEADERS = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type": "application/json"
}

def test_post_apiv1orders_places_new_order():
    # Reset seeded data before test
    reset_url = f"{BASE_URL}/api/v1/testing/reset"
    resp_reset = requests.delete(reset_url, timeout=TIMEOUT)
    assert resp_reset.status_code == 200, f"Reset failed with status {resp_reset.status_code}"

    order_url = f"{BASE_URL}/api/v1/orders"

    # Prepare order payload with valid seeded data
    payload = {
        "restaurant_id": "test-rest-0000-0000-000000000003",
        "items": [
            {"item_id": "test-menu-0000-0000-000000000005", "quantity": 1},
            {"item_id": "test-menu-0000-0000-000000000006", "quantity": 2}
        ],
        "delivery_address": {
            "street": "123 Test St",
            "city": "New York",
            "state": "NY",
            "zip": "10001",
            "country": "USA"
        },
        "payment_method_id": "pm_card_visa"  # Assuming this is a valid seeded payment method ID for testing
    }

    response = None
    try:
        response = requests.post(order_url, headers=HEADERS, json=payload, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to place order failed: {e}"

    assert response.status_code == 201, f"Expected 201 Created, got {response.status_code}"
    data = response.json()
    assert isinstance(data, dict), "Response is not a JSON object"
    assert "id" in data, "Order object missing id"
    assert data.get("restaurant_id") == payload["restaurant_id"], "Restaurant ID in response does not match request"
    assert "items" in data and isinstance(data["items"], list) and len(data["items"]) > 0, "Order items missing or empty"
    assert "delivery_address" in data and isinstance(data["delivery_address"], dict), "Delivery address missing or invalid"
    assert data.get("payment_method_id") == payload["payment_method_id"], "Payment method ID in response does not match request"

    # Cleanup order if created
    try:
        if response and response.status_code == 201:
            order_id = response.json().get("id")
            if order_id:
                delete_url = f"{BASE_URL}/api/v1/orders/{order_id}"
                requests.delete(delete_url, headers=HEADERS, timeout=TIMEOUT)
    except Exception:
        pass


test_post_apiv1orders_places_new_order()
