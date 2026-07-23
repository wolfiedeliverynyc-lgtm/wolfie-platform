import requests

BASE_URL = "http://localhost:5000"
TIMEOUT = 30

def test_post_apiv1authregister_with_valid_data():
    # Reset the database state before running the test
    reset_url = f"{BASE_URL}/api/v1/testing/reset"
    reset_response = requests.delete(reset_url, timeout=TIMEOUT)
    assert reset_response.status_code == 200 or reset_response.status_code == 204

    register_url = f"{BASE_URL}/api/v1/auth/register"
    headers = {"Content-Type": "application/json"}
    payload = {
        "name": "Test User",
        "email": "test.user@example.com",
        "phone": "12345678901",
        "password": "ValidPass123!",
        "role": "customer"
    }

    response = requests.post(register_url, json=payload, headers=headers, timeout=TIMEOUT)

    assert response.status_code == 201, f"Expected status 201, got {response.status_code}"

    response_json = response.json()
    # Expect user object and token in response
    assert "user" in response_json, "Response JSON missing 'user'"
    assert isinstance(response_json["user"], dict), "'user' is not an object"
    assert "token" in response_json, "Response JSON missing 'token'"
    assert isinstance(response_json["token"], str) and len(response_json["token"]) > 0, "'token' is empty or invalid"


test_post_apiv1authregister_with_valid_data()
