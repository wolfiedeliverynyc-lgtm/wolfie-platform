import requests

def test_post_api_v1_auth_otp_verify_verify_valid_otp():
    base_url = "http://127.0.0.1:5000/api/v1"
    headers = {"Content-Type": "application/json"}
    payload = {
        "phone": "+1234567890",
        "code": "123456"
    }

    try:
        response = requests.post(
            f"{base_url}/auth/otp/verify",
            json=payload,
            headers=headers,
            timeout=30
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        json_response = response.json()
        # The response is expected to be a "verified" message, check for it.
        assert "verified" in json_response or json_response == "verified", "Response does not indicate verified status"
    except requests.exceptions.RequestException as e:
        assert False, f"Request failed: {e}"

test_post_api_v1_auth_otp_verify_verify_valid_otp()