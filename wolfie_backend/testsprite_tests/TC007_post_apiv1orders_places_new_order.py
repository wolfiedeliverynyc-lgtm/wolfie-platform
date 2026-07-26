import requests

def test_post_apiv1orders_places_new_order():
    base_url = "http://127.0.0.1:5000/api/v1"
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LWN1c3QtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMiIsInJvbGUiOiJjdXN0b21lciIsImlhdCI6MTc4MzU5NDM1OSwiZXhwIjoxNzg2MTg2MzU5LCJ0eXBlIjoiYWNjZXNzIn0.i2TQroUUBsEMo80V_HraBriCFj9srvvRRl-pJpz9FBU"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Step 1: Get list of restaurants to find a valid restaurant_id
    try:
        resp_restaurants = requests.get(f"{base_url}/restaurants", timeout=30)
        assert resp_restaurants.status_code == 200, f"Failed to get restaurants, status {resp_restaurants.status_code}"
        restaurants_response = resp_restaurants.json()
        # Handle if response is a dict containing list
        if isinstance(restaurants_response, dict):
            # Try common keys for list
            if 'restaurants' in restaurants_response and isinstance(restaurants_response['restaurants'], list):
                restaurants = restaurants_response['restaurants']
            else:
                restaurants = list(restaurants_response.values())
        else:
            restaurants = restaurants_response
        assert isinstance(restaurants, list) and len(restaurants) > 0, "No restaurants found"
        restaurant_id = None
        for r in restaurants:
            if isinstance(r, dict) and "id" in r:
                restaurant_id = r["id"]
                break
        assert restaurant_id is not None, "No valid restaurant id found"
    except Exception as e:
        assert False, f"Exception getting restaurants: {e}"

    # Step 2: Get menu items for this restaurant to build order items
    try:
        resp_menu = requests.get(f"{base_url}/restaurants/{restaurant_id}/menu", timeout=30)
        assert resp_menu.status_code == 200, f"Failed to get menu for restaurant {restaurant_id}, status {resp_menu.status_code}"
        menu_items = resp_menu.json()
        assert isinstance(menu_items, list) and len(menu_items) > 0, "No menu items found for restaurant"
        # Choose first item with id and required fields
        item = None
        for mi in menu_items:
            if isinstance(mi, dict) and "id" in mi:
                item = {"item_id": mi["id"], "quantity": 1}
                break
        assert item is not None, "No valid menu item found"
    except Exception as e:
        assert False, f"Exception getting menu items: {e}"

    # Step 3: Get saved payment methods for the user to obtain a valid payment_method_id
    try:
        resp_pay_methods = requests.get(f"{base_url}/payments/methods", headers=headers, timeout=30)
        assert resp_pay_methods.status_code == 200, f"Failed to get payment methods, status {resp_pay_methods.status_code}"
        payment_methods = resp_pay_methods.json()
        assert isinstance(payment_methods, list) and len(payment_methods) > 0, "No saved payment methods found"
        payment_method_id = None
        for pm in payment_methods:
            if isinstance(pm, dict) and "id" in pm:
                payment_method_id = pm["id"]
                break
        assert payment_method_id is not None, "No valid payment_method_id found"
    except Exception as e:
        assert False, f"Exception getting payment methods: {e}"

    # Step 4: Prepare order payload
    delivery_address = {
        "street": "123 Test St",
        "city": "New York",
        "state": "NY",
        "zip": "10001"
    }
    order_payload = {
        "restaurant_id": restaurant_id,
        "items": [item],
        "delivery_address": delivery_address,
        "payment_method_id": payment_method_id
    }

    # Step 5: Place order and validate response
    order_id = None
    try:
        resp_order = requests.post(f"{base_url}/orders", json=order_payload, headers=headers, timeout=30)
        assert resp_order.status_code == 201, f"Expected 201 Created, got {resp_order.status_code}"
        order = resp_order.json()
        assert isinstance(order, dict), "Order response is not an object"
        assert "id" in order, "Order response missing 'id'"
        # Optionally validate other expected fields present
        order_id = order["id"]
    except Exception as e:
        assert False, f"Exception placing order: {e}"
    finally:
        # Cleanup: Try to cancel the created order (best effort)
        if order_id:
            try:
                headers_patch = headers.copy()
                resp_cancel = requests.patch(f"{base_url}/orders/{order_id}/cancel", headers=headers_patch, timeout=30)
                # cancellation might fail if not allowed, we ignore failure here
            except:
                pass

test_post_apiv1orders_places_new_order()
