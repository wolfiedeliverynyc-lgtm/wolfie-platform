import requests

BASE_URL = "http://localhost:5000"
TIMEOUT = 30
AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LWN1c3QtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMiIsInJvbGUiOiJjdXN0b21lciIsImlhdCI6MTc4MzU5NDM1OSwiZXhwIjoxNzg2MTg2MzU5LCJ0eXBlIjoiYWNjZXNzIn0.i2TQroUUBsEMo80V_HraBriCFj9srvvRRl-pJpz9FBU"
HEADERS = {"Authorization": f"Bearer {AUTH_TOKEN}", "Content-Type": "application/json"}


def test_post_apiv1paymentscreateintent_valid_amount_currency():
    # Reset seeded data at start
    reset_url = f"{BASE_URL}/api/v1/testing/reset"
    try:
        reset_resp = requests.delete(reset_url, timeout=TIMEOUT)
        assert reset_resp.status_code == 200, f"Reset failed with status {reset_resp.status_code}"
    except Exception as e:
        raise AssertionError(f"Reset request failed: {e}")

    try:
        url = f"{BASE_URL}/api/v1/payments/create-intent"
        payload = {"amount": 5000, "currency": "usd"}  # Valid amount and currency
        response = requests.post(url, json=payload, headers=HEADERS, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}"
        json_resp = response.json()
        assert "client_secret" in json_resp, "Response JSON missing 'client_secret'"
        assert isinstance(json_resp["client_secret"], str) and json_resp["client_secret"], "'client_secret' must be a non-empty string"
    except Exception as e:
        raise AssertionError(f"Test failed due to exception: {e}")


test_post_apiv1paymentscreateintent_valid_amount_currency()