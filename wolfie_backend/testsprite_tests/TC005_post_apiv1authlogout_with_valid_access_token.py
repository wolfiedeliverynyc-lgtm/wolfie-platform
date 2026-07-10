import requests

BASE_URL = "http://localhost:5000"
TIMEOUT = 30

def test_post_apiv1authlogout_with_valid_access_token():
    # Reset the environment before test
    reset_url = f"{BASE_URL}/api/v1/testing/reset"
    resp_reset = requests.delete(reset_url, timeout=TIMEOUT)
    assert resp_reset.status_code == 200, f"Reset failed with status {resp_reset.status_code}"

    # Use seeded customer credentials to login and get valid access token
    login_url = f"{BASE_URL}/api/v1/auth/login"
    login_payload = {
        "email": "test.customer@wolfie.delivery",
        "password": "TestPassword123!"
    }
    resp_login = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
    assert resp_login.status_code == 200, f"Login failed with status {resp_login.status_code}"
    login_data = resp_login.json()
    assert "access_token" in login_data, "No access_token in login response"
    access_token = login_data["access_token"]

    # Post to /api/v1/auth/logout with valid Access Token
    logout_url = f"{BASE_URL}/api/v1/auth/logout"
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    resp_logout = requests.post(logout_url, headers=headers, timeout=TIMEOUT)
    assert resp_logout.status_code == 200, f"Logout failed with status {resp_logout.status_code}"

test_post_apiv1authlogout_with_valid_access_token()