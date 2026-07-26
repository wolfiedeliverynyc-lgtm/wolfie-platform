import requests

def test_post_api_v1_auth_login_login_with_valid_credentials():
    base_url = "http://127.0.0.1:5000/api/v1"
    login_url = f"{base_url}/auth/login"
    headers = {"Content-Type": "application/json"}
    payload = {
        "email": "test-cust-0000-0000-000000000002@example.com",
        "password": "valid_password"
    }

    # The email and password above should be valid and exist in system for this test.
    # Since no creation or deletion specified, assume credentials exist.

    try:
        response = requests.post(login_url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    # Validate response status code
    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response content is not valid JSON"

    # Validate presence of required fields
    assert "access_token" in data and isinstance(data["access_token"], str) and data["access_token"], "Missing or invalid access_token"
    assert "refresh_token" in data and isinstance(data["refresh_token"], str) and data["refresh_token"], "Missing or invalid refresh_token"
    assert "user" in data and isinstance(data["user"], dict) and data["user"], "Missing or invalid user object"

test_post_api_v1_auth_login_login_with_valid_credentials()