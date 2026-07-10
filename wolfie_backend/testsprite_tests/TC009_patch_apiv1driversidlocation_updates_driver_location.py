import requests

BASE_URL = "http://localhost:5000"
TIMEOUT = 30

def test_patch_apiv1driversidlocation_updates_driver_location():
    driver_id = "test.driver-0000-0000-000000000002"
    patch_url = f"{BASE_URL}/api/v1/drivers/{driver_id}/location"
    token = ("Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
             "eyJzdWIiOiJ0ZXN0LWN1c3QtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMiIsInJvbGUiOiJjdXN0b21lciIs"
             "ImlhdCI6MTc4MzU5NDM1OSwiZXhwIjoxNzg2MTg2MzU5LCJ0eXBlIjoiYWNjZXNzIn0."
             "i2TQroUUBsEMo80V_HraBriCFj9srvvRRl-pJpz9FBU")

    headers = {
        "Authorization": token,
        "Content-Type": "application/json"
    }

    payload = {
        "lat": 40.712776,
        "lng": -74.005974
    }

    # Patch driver location
    response = requests.patch(patch_url, json=payload, headers=headers, timeout=TIMEOUT)

    assert response.status_code == 200
    # The PRD states 'updated' response, so check that response text contains 'updated'
    assert "updated" in response.text.lower()

test_patch_apiv1driversidlocation_updates_driver_location()
