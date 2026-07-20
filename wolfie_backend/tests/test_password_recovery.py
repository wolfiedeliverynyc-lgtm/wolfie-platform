import pytest
import uuid
from database import get_db_session, transaction
from database.schemas import User, PasswordResetOTP, SupportLog
from database.repositories import UserRepository
from services.email_otp_service import EmailOTPService

def test_password_recovery_flow(client):
    # Manually override to return a predictable OTP
    original_generate = EmailOTPService.generate_otp
    EmailOTPService.generate_otp = staticmethod(lambda: "999999")

    try:
        with client.application.app_context():
            # Setup clean test user
            uid = str(uuid.uuid4())[:8]
            email = f"customer_{uid}@test.com"
            password = "old_password_123"

            with transaction() as session:
                user = User(
                    email=email,
                    password_hash="fake_hash",
                    full_name="Test Customer",
                    role="customer",
                    phone=f"+1555555{uid}",
                    is_active=True
                )
                session.add(user)
                session.flush()
                UserRepository(session).update_password(user, password)
                session.commit()

            # 1. Forgot password request
            res_exists = client.post("/api/v1/auth/customer/forgot-password", json={"email": email})
            assert res_exists.status_code == 200
            assert "verification code has been sent" in res_exists.json["message"]

            res_nonexistent = client.post("/api/v1/auth/customer/forgot-password", json={"email": "nonexistent@test.com"})
            assert res_nonexistent.status_code == 200
            assert "verification code has been sent" in res_nonexistent.json["message"]

            # 2. Verify OTP code
            # Test wrong OTP code
            res_wrong = client.post("/api/v1/auth/customer/verify-reset-otp", json={"email": email, "otp": "000000"})
            assert res_wrong.status_code == 400
            assert "Invalid verification code" in res_wrong.json["error"]

            # Test correct OTP code
            res_correct = client.post("/api/v1/auth/customer/verify-reset-otp", json={"email": email, "otp": "999999"})
            assert res_correct.status_code == 200
            assert res_correct.json["verified"] is True

            # 3. Reset password
            new_password = "new_password_123"
            res_reset = client.post("/api/v1/auth/customer/reset-password", json={
                "email": email,
                "otp": "999999",
                "new_password": new_password
            })
            assert res_reset.status_code == 200
            assert res_reset.json["success"] is True

            # Verify password is changed in DB
            with get_db_session() as session:
                user_db = session.query(User).filter(User.email == email).first()
                assert UserRepository.verify_password(new_password, user_db.password_hash) is True

                # Verify security log exists in SupportLog
                log = (
                    session.query(SupportLog)
                    .filter(SupportLog.actor_id == user_db.id, SupportLog.action == "password_reset_success")
                    .first()
                )
                assert log is not None
    finally:
        EmailOTPService.generate_otp = original_generate
