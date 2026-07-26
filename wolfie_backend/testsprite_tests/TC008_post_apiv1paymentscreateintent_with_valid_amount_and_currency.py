import requests

def test_post_apiv1paymentscreateintent_with_valid_amount_and_currency():
    base_url = "http://127.0.0.1:5000/api/v1/payments/create-intent"
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LWN1c3QtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMiIsInJvbGUiOiJjdXN0b21lciIsImlhdCI6MTc4MzU5NDM1OSwiZXhwIjoxNzg2MTg2MzU5LCJ0eXBlIjoiYWNjZXNzIn0.i2TQroUUBsEMo80V_HraBriCFj9srvvRRl-pJpz9FBU"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    payload = {
        "amount": 1500,
        "currency": "usd"
    }
    try:
        response = requests.post(base_url, json=payload, headers=headers, timeout=30)
        assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
        json_resp = response.json()
        assert "client_secret" in json_resp, "Response JSON does not contain 'client_secret'"
        assert isinstance(json_resp["client_secret"], str) and json_resp["client_secret"], "'client_secret' should be a non-empty string"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_post_apiv1paymentscreateintent_with_valid_amount_and_currency()