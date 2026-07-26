import requests

def test_post_api_v1_auth_register_register_new_customer():
    base_url = "http://127.0.0.1:5000/api/v1"
    url = f"{base_url}/auth/register"
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LWN1c3QtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMiIsInJvbGUiOiJjdXN0b21lciIsImlhdCI6MTc4MzU5NDM1OSwiZXhwIjoxNzg2MTg2MzU5LCJ0eXBlIjoiYWNjZXNzIn0.i2TQroUUBsEMo80V_HraBriCFj9srvvRRl-pJpz9FBU"
    }

    payload = {
        "full_name": "Test Customer",
        "email": "test.customer@example.com",
        "phone": "+15555550123",
        "password": "StrongPass!23",
        "role": "customer"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 201, f"Expected 201, got {response.status_code}"
    try:
        json_response = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert "user" in json_response, "Response JSON missing 'user' key"
    assert "token" in json_response, "Response JSON missing 'token' key"
    user = json_response["user"]
    token = json_response["token"]
    assert isinstance(user, dict), "'user' should be a dict"
    assert isinstance(token, str) and len(token) > 0, "'token' should be a non-empty string"

test_post_api_v1_auth_register_register_new_customer()