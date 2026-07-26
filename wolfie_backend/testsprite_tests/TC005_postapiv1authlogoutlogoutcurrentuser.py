import requests

def test_post_api_v1_auth_logout_logout_current_user():
    base_url = "http://127.0.0.1:5000/api/v1"
    logout_endpoint = f"{base_url}/auth/logout"
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LWN1c3QtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMiIsInJvbGUiOiJjdXN0b21lciIsImlhdCI6MTc4MzU5NDM1OSwiZXhwIjoxNzg2MTg2MzU5LCJ0eXBlIjoiYWNjZXNzIn0.i2TQroUUBsEMo80V_HraBriCFj9srvvRRl-pJpz9FBU"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    try:
        response = requests.post(logout_endpoint, headers=headers, timeout=30)
        assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
        # Optionally check response content if defined by API (e.g. "logged out" text)
        # assert "logged out" in response.text.lower()
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_post_api_v1_auth_logout_logout_current_user()