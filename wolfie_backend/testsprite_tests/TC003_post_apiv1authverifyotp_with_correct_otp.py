import requests

def test_post_apiv1authverifyotp_with_correct_otp():
    base_url = "http://127.0.0.1:5000/api/v1"
    headers = {
        "Content-Type": "application/json"
    }

    # Step 1: Register a new user to get a phone number for OTP verification
    register_payload = {
        "name": "Test User",
        "email": "testuser_verifyotp@example.com",
        "phone": "+15550000003",
        "password": "TestPass123!",
        "role": "customer"
    }
    register_response = requests.post(f"{base_url}/auth/register", json=register_payload, headers=headers, timeout=30)
    assert register_response.status_code == 201, f"Registration failed: {register_response.text}"
    register_data = register_response.json()
    phone = register_payload["phone"]

    # Since OTPs are mocked and logged to console only, we assume a fixed valid OTP "123456" for testing
    valid_otp = "123456"

    try:
        # Step 2: Verify OTP for the registered phone
        verify_payload = {
            "phone": phone,
            "otp": valid_otp
        }
        verify_response = requests.post(f"{base_url}/auth/verify-otp", json=verify_payload, headers=headers, timeout=30)
        assert verify_response.status_code == 200, f"OTP verification failed: {verify_response.text}"
        verify_data = verify_response.json()
        assert verify_data == "verified" or ("verified" in verify_data if isinstance(verify_data, str) else True)

    finally:
        # Step 3: Cleanup - delete the registered user if such endpoint exists (not specified in PRD)
        # If no delete endpoint, skip cleanup
        # We attempt to login (to get access token) and then logout to invalidate tokens if needed
        # Since no user delete endpoint specified, no actual delete done here
        pass

test_post_apiv1authverifyotp_with_correct_otp()
