import requests

BASE_URL = "http://localhost:5000"

def test_post_apiv1authlogin_with_valid_credentials():
    reset_url = f"{BASE_URL}/api/v1/testing/reset"
    login_url = f"{BASE_URL}/api/v1/auth/login"
    timeout = 30

    # Reset data before test
    resp_reset = requests.delete(reset_url, timeout=timeout)
    assert resp_reset.status_code in [200, 204], f"Reset failed with status {resp_reset.status_code}"

    login_payload = {
        "email": "test.customer@wolfie.delivery",
        "password": "TestPassword123!"
    }
    headers = {"Content-Type": "application/json"}

    try:
        response = requests.post(login_url, json=login_payload, headers=headers, timeout=timeout)
    except requests.RequestException as e:
        assert False, f"Request to login endpoint failed: {e}"

    assert response.status_code == 200, f"Expected status 200 but got {response.status_code}"

    response_json = response.json()
    # Verify presence of access_token, refresh_token, and user objects
    assert "access_token" in response_json, "access_token missing in response"
    assert "refresh_token" in response_json, "refresh_token missing in response"
    assert "user" in response_json, "user object missing in response"
    # Additional basic assertions on content types
    assert isinstance(response_json["access_token"], str) and len(response_json["access_token"]) > 0
    assert isinstance(response_json["refresh_token"], str) and len(response_json["refresh_token"]) > 0
    assert isinstance(response_json["user"], dict)
    # Optional: check user's email matches login email
    assert response_json["user"].get("email") == login_payload["email"]

test_post_apiv1authlogin_with_valid_credentials()