import requests

BASE_URL = "http://localhost:5000"
RESET_ENDPOINT = f"{BASE_URL}/api/v1/testing/reset"
ORDERS_ENDPOINT = f"{BASE_URL}/api/v1/orders"
TRACKING_ENDPOINT_TEMPLATE = f"{BASE_URL}/api/v1/tracking/{{order_id}}"
PAYMENT_INTENT_ENDPOINT = f"{BASE_URL}/api/v1/payments/create-intent"

AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LWN1c3QtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMiIsInJvbGUiOiJjdXN0b21lciIsImlhdCI6MTc4MzU5NDM1OSwiZXhwIjoxNzg2MTg2MzU5LCJ0eXBlIjoiYWNjZXNzIn0.i2TQroUUBsEMo80V_HraBriCFj9srvvRRl-pJpz9FBU"
HEADERS = {"Authorization": f"Bearer {AUTH_TOKEN}"}

def test_get_apiv1trackingorderid_returns_live_tracking_info():
    # Reset seeded data at start
    reset_resp = requests.delete(RESET_ENDPOINT, timeout=30)
    assert reset_resp.status_code == 200, f"Failed to reset testing data. Status: {reset_resp.status_code}"

    # Place an order first to have a valid order_id (seeded data required for placing order)
    restaurant_id = "test-rest-0000-0000-000000000003"
    items = [
        {"menu_item_id": "test-menu-0000-0000-000000000005", "quantity": 1}
    ]
    delivery_address = {
        "street": "123 Test St",
        "city": "New York",
        "state": "NY",
        "zip": "10001"
    }
    payment_method_id = "test-payment-method-0001"

    order_payload = {
        "restaurant_id": restaurant_id,
        "items": items,
        "delivery_address": delivery_address,
        "payment_method_id": payment_method_id
    }

    order_resp = requests.post(ORDERS_ENDPOINT, json=order_payload, headers=HEADERS, timeout=30)
    assert order_resp.status_code == 201, f"Order creation failed with status {order_resp.status_code}: {order_resp.text}"
    order_data = order_resp.json()
    order_id = order_data.get("id")
    assert order_id, "Order ID is missing in order creation response"

    try:
        tracking_resp = requests.get(TRACKING_ENDPOINT_TEMPLATE.format(order_id=order_id), headers=HEADERS, timeout=30)
        assert tracking_resp.status_code == 200, f"Tracking retrieval failed with status {tracking_resp.status_code}: {tracking_resp.text}"

        tracking_data = tracking_resp.json()
        assert isinstance(tracking_data, dict), "Tracking response is not a JSON object"

        assert "driver" in tracking_data, "'driver' key missing in tracking data"
        driver_info = tracking_data["driver"]
        assert isinstance(driver_info, dict), "'driver' data is not an object"

        coordinates = None
        if "coordinates" in driver_info:
            coordinates = driver_info["coordinates"]
        elif "location" in driver_info:
            coordinates = driver_info["location"]
        else:
            if "lat" in driver_info and "lng" in driver_info:
                coordinates = {"lat": driver_info["lat"], "lng": driver_info["lng"]}

        assert coordinates is not None, "Driver coordinates missing in tracking data"
        assert isinstance(coordinates, dict), "Coordinates is not a dict"
        assert "lat" in coordinates and "lng" in coordinates, "Coordinates does not contain 'lat' and 'lng'"
        assert isinstance(coordinates["lat"], (float, int)), "'lat' is not a number"
        assert isinstance(coordinates["lng"], (float, int)), "'lng' is not a number"

    finally:
        cancel_endpoint = f"{ORDERS_ENDPOINT}/{order_id}/cancel"
        cancel_resp = requests.patch(cancel_endpoint, headers=HEADERS, timeout=30)
        if cancel_resp.status_code not in [200, 400, 404]:
            raise Exception(f"Unexpected status code when cancelling order: {cancel_resp.status_code}")

test_get_apiv1trackingorderid_returns_live_tracking_info()