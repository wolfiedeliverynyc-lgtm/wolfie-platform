import requests

def test_post_apiv1authregister_with_valid_data():
    base_url = "http://127.0.0.1:5000/api/v1/auth/register"
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LWN1c3QtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMiIsInJvbGUiOiJjdXN0b21lciIsImlhdCI6MTc4MzU5NDM1OSwiZXhwIjoxNzg2MTg2MzU5LCJ0eXBlIjoiYWNjZXNzIn0.i2TQroUUBsEMo80V_HraBriCFj9srvvRRl-pJpz9FBU"
    }
    payload = {
        "full_name": "John Doe",
        "email": "john.doe.unique@example.com",
        "phone": "+12345678901",
        "role": "customer",
        "password": "StrongPassword!123"
    }
    try:
        response = requests.post(base_url, json=payload, headers=headers, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"
    assert response.status_code == 201, f"Expected status code 201, got {response.status_code}"
    try:
        response_json = response.json()
    except ValueError:
        assert False, "Response is not a valid JSON"
    assert "user" in response_json, "Response JSON does not contain 'user' key"
    assert "token" in response_json, "Response JSON does not contain 'token' key"
    user = response_json["user"]
    token = response_json["token"]
    assert isinstance(user, dict), "'user' is not an object"
    assert isinstance(token, str) and token, "'token' is not a non-empty string"
    # Check that registered user's fields match the sent data (as much as possible)
    assert user.get("full_name") == payload["full_name"], "User full_name mismatch"
    assert user.get("email") == payload["email"], "User email mismatch"
    assert user.get("phone") == payload["phone"], "User phone mismatch"
    assert user.get("role") == payload["role"], "User role mismatch"

test_post_apiv1authregister_with_valid_data()