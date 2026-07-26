import requests

def test_post_apiv1authlogin_with_valid_credentials():
    base_url = "http://127.0.0.1:5000/api/v1"
    url = f"{base_url}/auth/login"
    headers = {
        "Content-Type": "application/json"
    }
    payload = {
        "email": "test-cust-0000-0000-000000000002@example.com",
        "password": "correct_password"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        assert response.status_code == 200, f"Expected status 200 but got {response.status_code}"
        data = response.json()
        assert "access_token" in data, "Response missing access_token"
        assert "refresh_token" in data, "Response missing refresh_token"
        assert "user" in data, "Response missing user object"
        # Optional: further checks on user object structure
        user = data["user"]
        assert isinstance(user, dict), "User should be a dictionary"
        assert "email" in user and user["email"] == payload["email"], "User email mismatch"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

# The email and password should be valid credentials already registered in the system.
# Since no credentials are provided, using plausible example email and password for testing.
test_post_apiv1authlogin_with_valid_credentials()