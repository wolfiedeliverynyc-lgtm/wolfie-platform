import requests

def test_post_api_v1_auth_refresh_refresh_access_token():
    base_url = "http://127.0.0.1:5000/api/v1/auth/refresh"
    refresh_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LWN1c3QtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMiIsInJvbGUiOiJjdXN0b21lciIsImlhdCI6MTc4MzU5NDM1OSwiZXhwIjoxNzg2MTg2MzU5LCJ0eXBlIjoiYWNjZXNzdCJ9.i2TQroUUBsEMo80V_HraBriCFj9srvvRRl-pJpz9FBU"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {refresh_token}"
    }
    try:
        response = requests.post(base_url, headers=headers, timeout=30)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"
    json_response = response.json()
    assert "access_token" in json_response, "Response JSON does not contain 'access_token'"
    assert isinstance(json_response["access_token"], str) and len(json_response["access_token"]) > 0, \
        "'access_token' should be a non-empty string"

test_post_api_v1_auth_refresh_refresh_access_token()
