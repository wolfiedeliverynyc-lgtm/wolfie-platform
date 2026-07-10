import requests

BASE_URL = "http://localhost:5000"
TIMEOUT = 30

def test_post_apiv1authrefresh_valid_refresh_token():
    reset_url = f"{BASE_URL}/api/v1/testing/reset"
    refresh_url = f"{BASE_URL}/api/v1/auth/refresh"

    # Seeded refresh token from instructions
    refresh_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LWN1c3QtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMiIsInJvbGUiOiJjdXN0b21lciIsImlhdCI6MTc4MzU5NDM1OSwiZXhwIjoxNzg2MTg2MzU5LCJ0eXBlIjoiYWNjZXNzIn0.i2TQroUUBsEMo80V_HraBriCFj9srvvRRl-pJpz9FBU"

    # Reset system to clean state before test
    resp_reset = requests.delete(reset_url, timeout=TIMEOUT)
    assert resp_reset.status_code == 200 or resp_reset.status_code == 204, f"Reset failed with status {resp_reset.status_code}"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {refresh_token}"
    }

    # POST /api/v1/auth/refresh with refresh token in Authorization header
    resp = requests.post(refresh_url, headers=headers, timeout=TIMEOUT)
    assert resp.status_code == 200, f"Expected status 200, got {resp.status_code}"

    json_data = resp.json()
    # Assert new access_token is present and is a non-empty string
    assert "access_token" in json_data, "Response missing 'access_token'"
    assert isinstance(json_data["access_token"], str) and json_data["access_token"], "Invalid 'access_token' value"

test_post_apiv1authrefresh_valid_refresh_token()
