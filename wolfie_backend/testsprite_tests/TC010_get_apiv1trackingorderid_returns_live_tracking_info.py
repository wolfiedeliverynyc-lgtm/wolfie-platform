import requests

BASE_URL = "http://127.0.0.1:5000/api/v1"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LWN1c3QtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMiIsInJvbGUiOiJjdXN0b21lciIsImlhdCI6MTc4MzU5NDM1OSwiZXhwIjoxNzg2MTg2MzU5LCJ0eXBlIjoiYWNjZXNzIn0.i2TQroUUBsEMo80V_HraBriCFj9srvvRRl-pJpz9FBU"
HEADERS = {"Authorization": f"Bearer {TOKEN}"}
TIMEOUT = 30

def test_get_live_tracking_info():
    # First, create a new order to have a valid order_id for tracking
    order_payload = {
        # To create an order we need restaurant_id, items, delivery_address, payment_method_id
        # We'll retrieve values as needed from other endpoints.
    }

    # Step 1: Get list of restaurants to select a valid restaurant_id
    restaurants_resp = requests.get(f"{BASE_URL}/restaurants", timeout=TIMEOUT)
    assert restaurants_resp.status_code == 200, f"Failed to get restaurants: {restaurants_resp.text}"
    restaurants = restaurants_resp.json()
    assert isinstance(restaurants, list) and len(restaurants) > 0, "No restaurants found"
    restaurant_id = restaurants[0].get("id") or restaurants[0].get("restaurant_id")
    assert restaurant_id, "Restaurant id not found in restaurant object"

    # Step 2: Get menu of the selected restaurant to retrieve items for order
    menu_resp = requests.get(f"{BASE_URL}/restaurants/{restaurant_id}/menu", timeout=TIMEOUT)
    assert menu_resp.status_code == 200, f"Failed to get restaurant menu: {menu_resp.text}"
    menu = menu_resp.json()
    assert isinstance(menu, list) and len(menu) > 0, "No menu items found"
    # Select one item with required fields - assuming id and quantity or similar required
    first_item = menu[0]
    # Prepare items for order - assuming "id" and "quantity" keys
    order_items = [{"id": first_item.get("id") or first_item.get("item_id"), "quantity": 1}]
    assert order_items[0]["id"], "Menu item id not found"

    # Step 3: Get payment methods to pick one valid payment_method_id (needs authentication)
    payments_methods_resp = requests.get(f"{BASE_URL}/payments/methods", headers=HEADERS, timeout=TIMEOUT)
    assert payments_methods_resp.status_code == 200, f"Failed to get payment methods: {payments_methods_resp.text}"
    payment_methods = payments_methods_resp.json()
    assert isinstance(payment_methods, list) and len(payment_methods) > 0, "No payment methods found"
    payment_method_id = payment_methods[0].get("id") or payment_methods[0].get("payment_method_id")
    assert payment_method_id, "Payment method id not found"

    # Step 4: Prepare delivery_address - assuming some typical address object fields
    delivery_address = {
        "street": "123 Test St",
        "city": "New York",
        "state": "NY",
        "zip_code": "10001",
        "country": "USA"
    }

    order_payload = {
        "restaurant_id": restaurant_id,
        "items": order_items,
        "delivery_address": delivery_address,
        "payment_method_id": payment_method_id
    }

    order_resp = requests.post(f"{BASE_URL}/orders", headers=HEADERS, json=order_payload, timeout=TIMEOUT)
    assert order_resp.status_code == 201, f"Failed to create order: {order_resp.text}"
    order = order_resp.json()
    order_id = order.get("id") or order.get("order_id")
    assert order_id, "Order id not found in order response"

    try:
        # Step 5: Use the order_id to get live tracking info
        tracking_resp = requests.get(f"{BASE_URL}/tracking/{order_id}", headers=HEADERS, timeout=TIMEOUT)
        assert tracking_resp.status_code == 200, f"Failed to get tracking info: {tracking_resp.text}"
        tracking_info = tracking_resp.json()
        # Validate tracking object presence
        assert isinstance(tracking_info, dict), "Tracking response is not a JSON object"
        # Validate presence of driver coordinates (e.g., lat, lng)
        driver = tracking_info.get("driver") or tracking_info.get("driver_info") or {}
        lat = driver.get("lat") or driver.get("latitude")
        lng = driver.get("lng") or driver.get("longitude")
        # There might be a coordinates field directly or nested
        if lat is None or lng is None:
            coords = tracking_info.get("driver_coordinates") or tracking_info.get("coordinates")
            if coords and isinstance(coords, dict):
                lat = coords.get("lat") or coords.get("latitude")
                lng = coords.get("lng") or coords.get("longitude")
        assert lat is not None and lng is not None, "Driver coordinates not found in tracking data"
    finally:
        # Cleanup: Cancel or delete the order to avoid polluting test data
        cancel_resp = requests.patch(f"{BASE_URL}/orders/{order_id}/cancel", headers=HEADERS, timeout=TIMEOUT)
        assert cancel_resp.status_code in (200, 400), f"Order cancel failed: {cancel_resp.text}"
        # 400 is accepted because order might be uncancellable immediately, just pass in that case

test_get_live_tracking_info()