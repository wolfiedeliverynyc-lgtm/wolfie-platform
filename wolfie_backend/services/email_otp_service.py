import hashlib
import logging
import random
import string
import os
import requests
from datetime import datetime, timezone, timedelta
from database.schemas import PasswordResetOTP, User, SupportLog

logger = logging.getLogger("wolfie.email_otp")
UTC = timezone.utc

class EmailOTPService:
    @staticmethod
    def generate_otp() -> str:
        return "".join(random.choices(string.digits, k=6))

    @staticmethod
    def hash_otp(otp: str) -> str:
        return hashlib.sha256(otp.encode("utf-8")).hexdigest()

    @staticmethod
    def send_otp(email: str, otp: str, user_type: str) -> bool:
        api_key = os.getenv("RESEND_API_KEY")
        from_email = os.getenv("EMAIL_FROM", "noreply@wolfie.delivery")

        # Determine brand colors based on user_type
        if user_type == "customer":
            primary_color = "#EF2A39" # Wolfie Red
            bg_color = "#3C2F2F"      # Dark Charcoal
            portal_name = "Wolfie Gourmet Delivery"
        elif user_type == "driver":
            primary_color = "#FFE100" # Wolfie Yellow
            bg_color = "#000000"      # Pitch Black
            portal_name = "Wolfie Courier Fleet"
        else:
            primary_color = "#FFE100" # Wolfie Yellow
            bg_color = "#080808"      # Matte Black
            portal_name = "Wolfie Restaurant OS"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset your Wolfie password</title>
          <style>
            body {{
              margin: 0; padding: 0; background-color: #F6F6F6; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            }}
            .container {{
              max-width: 600px; margin: 20px auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            }}
            .header {{
              background-color: {bg_color}; padding: 30px; text-align: center; color: #FFFFFF;
            }}
            .header h1 {{
              margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;
            }}
            .content {{
              padding: 40px; color: #3C2F2F; line-height: 1.6;
            }}
            .otp-container {{
              background-color: #F8F9FA; border: 1px solid #EAEAEA; border-radius: 12px; padding: 20px; text-align: center; margin: 30px 0;
            }}
            .otp-code {{
              font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: bold; letter-spacing: 6px; color: {primary_color}; margin: 0;
            }}
            .footer {{
              background-color: #F8F9FA; padding: 20px; text-align: center; font-size: 12px; color: #A6A6A6; border-top: 1px solid #EAEAEA;
            }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>WOLFIE</h1>
              <p style="margin: 5px 0 0 0; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: {primary_color}; font-weight: bold;">{portal_name}</p>
            </div>
            <div class="content">
              <p style="font-size: 16px; font-weight: bold;">Hello,</p>
              <p>Your Wolfie verification code is:</p>
              <div class="otp-container">
                <p class="otp-code">{otp}</p>
              </div>
              <p>This code expires in <strong>10 minutes</strong>.</p>
              <p style="color: #A6A6A6; font-size: 14px;">If you didn't request this password reset, ignore this email.</p>
            </div>
            <div class="footer">
              <p>Secured with 256-bit encryption · Wolfie Inc. © 2026</p>
            </div>
          </div>
        </body>
        </html>
        """

        # Log or send email
        mock_email = not api_key or api_key == "mock" or api_key.startswith("your_")
        if mock_email:
            logger.info(f"\n========================================================"
                        f"\n[MOCK EMAIL] OTP for {email} ({user_type}):"
                        f"\nSubject: Reset your Wolfie password"
                        f"\nOTP Code: {otp}"
                        f"\n========================================================")
            return True

        # Call Resend API using requests
        try:
            res = requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": f"Wolfie Delivery <{from_email}>",
                    "to": [email],
                    "subject": "Reset your Wolfie password",
                    "html": html_content
                },
                timeout=10
            )
            if res.status_code in (200, 201):
                logger.info(f"Email successfully sent to {email} via Resend")
                return True
            else:
                logger.error(f"Failed to send email to {email} via Resend: {res.status_code} {res.text}")
                return False
        except Exception as e:
            logger.error(f"Error sending email to {email} via Resend: {e}")
            return False

    @classmethod
    def create_reset_otp(cls, session, email: str, user_id: str, user_type: str) -> bool:
        # 1. Invalidate previous OTPs
        cls.invalidate_otp(session, email)

        # 2. Generate and store new OTP
        otp = cls.generate_otp()
        otp_hash = cls.hash_otp(otp)
        expires_at = datetime.now(UTC) + timedelta(minutes=10)

        reset_entry = PasswordResetOTP(
            user_id=user_id,
            user_type=user_type,
            email=email.lower().strip(),
            otp_hash=otp_hash,
            expires_at=expires_at,
            attempts=0,
            is_used=False
        )
        session.add(reset_entry)
        session.flush()

        # 3. Send email
        return cls.send_otp(email, otp, user_type)

    @classmethod
    def verify_otp_code(cls, session, email: str, otp: str, mark_used: bool = False) -> tuple[bool, str]:
        """
        Returns (success: bool, error_message: str)
        """
        email_clean = email.lower().strip()
        # Find latest unused and unexpired OTP
        now = datetime.now(UTC)
        entry = (
            session.query(PasswordResetOTP)
            .filter(
                PasswordResetOTP.email == email_clean,
                PasswordResetOTP.is_used == False,
                PasswordResetOTP.expires_at > now
            )
            .order_by(PasswordResetOTP.created_at.desc())
            .first()
        )

        if not entry:
            return False, "Invalid or expired verification code."

        # Increment attempts
        entry.attempts += 1
        session.flush()

        if entry.attempts > 5:
            entry.is_used = True
            session.flush()
            return False, "Maximum verification attempts exceeded. Please request a new code."

        # Compare hash
        input_hash = cls.hash_otp(otp)
        if entry.otp_hash != input_hash:
            return False, "Invalid verification code."

        if mark_used:
            entry.is_used = True
            session.flush()

        return True, ""

    @staticmethod
    def invalidate_otp(session, email: str):
        email_clean = email.lower().strip()
        session.query(PasswordResetOTP).filter(
            PasswordResetOTP.email == email_clean,
            PasswordResetOTP.is_used == False
        ).update({"is_used": True}, synchronize_session=False)
        session.flush()

    @staticmethod
    def cleanup_expired_otp(session):
        now = datetime.now(UTC)
        session.query(PasswordResetOTP).filter(
            PasswordResetOTP.expires_at < now
        ).delete(synchronize_session=False)
        session.flush()
