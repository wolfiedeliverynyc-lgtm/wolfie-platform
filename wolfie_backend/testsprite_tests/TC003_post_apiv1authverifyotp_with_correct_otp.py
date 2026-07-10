import requests

BASE_URL = "http://localhost:5000"
TIMEOUT = 30
HEADERS = {
    "Content-Type": "application/json"
}
PHONE = "+1234567890"  # Assuming seeded data includes a known phone number for OTP verification test
VALID_OTP = "123456"   # Assuming this is the valid OTP for seeded data phone number

def test_post_apiv1authverifyotp_with_correct_otp():
    # Reset test environment
    reset_url = f"{BASE_URL}/api/v1/testing/reset"
    resp_reset = requests.delete(reset_url, timeout=TIMEOUT)
    assert resp_reset.status_code == 200 or resp_reset.status_code == 204

    # Use known seeded phone and valid OTP from instructions or assume typical test values
    url = f"{BASE_URL}/api/v1/auth/verify-otp"
    payload = {
        "phone": PHONE,
        "otp": VALID_OTP
    }
    try:
        response = requests.post(url, json=payload, headers=HEADERS, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected 200 but got {response.status_code}"
    # Response body expected to confirm verified status, assume JSON with a success message or boolean
    try:
        json_resp = response.json()
    except Exception:
        assert False, "Response is not valid JSON"

    # We expect a key confirming verification, e.g. "verified": true or a success message
    assert ("verified" in json_resp or "message" in json_resp), "Response missing verification confirmation"

test_post_apiv1authverifyotp_with_correct_otp()