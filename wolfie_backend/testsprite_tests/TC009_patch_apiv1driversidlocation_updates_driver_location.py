import requests

BASE_URL = "http://127.0.0.1:5000/api/v1"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LWN1c3QtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMiIsInJvbGUiOiJjdXN0b21lciIsImlhdCI6MTc4MzU5NDM1OSwiZXhwIjoxNzg2MTg2MzU5LCJ0eXBlIjoiYWNjZXNzIn0.i2TQroUUBsEMo80V_HraBriCFj9srvvRRl-pJpz9FBU"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}
TIMEOUT = 30

def test_patch_apiv1driversidlocation_updates_driver_location():
    # Step 1: Get list of available drivers to obtain a valid driver id
    drivers_url = f"{BASE_URL}/drivers/available"
    try:
        drivers_resp = requests.get(drivers_url, headers=HEADERS, timeout=TIMEOUT)
        assert drivers_resp.status_code == 200, f"Expected 200, got {drivers_resp.status_code}"
        drivers = drivers_resp.json()
        assert isinstance(drivers, list), "Expected list of available drivers"
        assert len(drivers) > 0, "No available drivers found for testing"

        driver_id = None
        # Try to find a valid driver with an id attribute
        for driver in drivers:
            if "id" in driver:
                driver_id = driver["id"]
                break
        assert driver_id is not None, "No driver ID found in available drivers"

        # Step 2: Patch driver location with valid latitude and longitude
        patch_url = f"{BASE_URL}/drivers/{driver_id}/location"
        payload = {
            "lat": 40.7128,
            "lng": -74.0060
        }
        patch_resp = requests.patch(patch_url, headers=HEADERS, json=payload, timeout=TIMEOUT)

        assert patch_resp.status_code == 200, f"Expected 200 on patch, got {patch_resp.status_code}"
        # Response body expected is some confirmation of update, check content accordingly
        response_json = patch_resp.json()
        # Just check that some response content exists and is a dict
        assert isinstance(response_json, dict), "Response JSON should be a dictionary"
    except requests.RequestException as e:
        assert False, f"HTTP request failed: {e}"

test_patch_apiv1driversidlocation_updates_driver_location()