"""
╔══════════════════════════════════════════════════════════════╗
║   WOLFIE DELIVERY — routes/auth.py  (v3 — Repositories)     ║
╚══════════════════════════════════════════════════════════════╝
"""

import os
import random
import string
import logging
from datetime import datetime, timezone, timedelta
from functools import wraps

import jwt
from flask import Blueprint, request, jsonify, current_app
from database import transaction, get_db_session
from services.redis_service import rate_limit
from services.error_handler import UnauthorizedError, ForbiddenError
from database.repositories import UserRepository

auth_bp = Blueprint("auth", __name__)
logger  = logging.getLogger("wolfie")
UTC     = timezone.utc


# ── Token helpers ─────────────────────────────────────────────

def _generate_tokens(user_id: str, role: str, secret: str, admin_type: str = None) -> dict:
    import uuid
    access_jti = str(uuid.uuid4())
    refresh_jti = str(uuid.uuid4())
    now = datetime.now(UTC)
    access_payload = {
        "sub": user_id, "role": role, "iat": now,
        "exp": now + timedelta(hours=24), "type": "access",
        "jti": access_jti
    }
    refresh_payload = {
        "sub": user_id, "role": role, "iat": now,
        "exp": now + timedelta(days=30), "type": "refresh",
        "jti": refresh_jti
    }
    if admin_type:
        access_payload["admin_type"] = admin_type
        refresh_payload["admin_type"] = admin_type

    # Register in SessionStore if redis is active
    try:
        redis_inst = getattr(current_app, "redis", None)
        if redis_inst:
            redis_inst.sessions.store(access_jti, user_id, role, ttl=86400)
            redis_inst.sessions.store(refresh_jti, user_id, role, ttl=30 * 86400)
    except Exception:
        pass

    return {
        "access_token": jwt.encode(access_payload, secret, algorithm="HS256"),
        "refresh_token": jwt.encode(refresh_payload, secret, algorithm="HS256"),
        "expires_in": 86400,
    }


def _decode_token(token: str, secret: str) -> dict | None:
    try:
        return jwt.decode(token, secret, algorithms=["HS256"])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


# ── Auth decorator ────────────────────────────────────────────

def require_auth(roles: list[str] | None = None, admin_types: list[str] | None = None):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            raw = request.headers.get("Authorization", "")
            if not raw.startswith("Bearer "):
                raise UnauthorizedError("Missing or invalid Authorization header")
            payload = _decode_token(raw[7:], current_app.config["JWT_SECRET_KEY"])
            if not payload:
                raise UnauthorizedError("Token expired or invalid")
            if payload.get("type") != "access":
                raise UnauthorizedError("Refresh token cannot be used here")
                
            # Session revocation check (fail-open if Redis is down)
            jti = payload.get("jti")
            if jti:
                redis_inst = getattr(current_app, "redis", None)
                if redis_inst:
                    try:
                        if not redis_inst.sessions.is_valid(jti):
                            raise UnauthorizedError("Token has been revoked")
                    except (UnauthorizedError, ForbiddenError):
                        raise
                    except Exception:
                        pass

            if roles and payload.get("role") not in roles:
                raise ForbiddenError("Insufficient permissions")
            
            # Check admin_type if requested
            if admin_types and payload.get("role") == "admin":
                if payload.get("admin_type") not in admin_types:
                    # Allow super_admin to access everything
                    if payload.get("admin_type") != "super_admin":
                        raise ForbiddenError("Insufficient admin permissions")

            request.user_id   = payload["sub"]
            request.user_role = payload["role"]
            request.admin_type = payload.get("admin_type")
            return f(*args, **kwargs)
        return wrapped
    return decorator


# ══════════════════════════════════════════════════════════════

@auth_bp.route("/register", methods=["POST"])
@rate_limit(limit=5, window=300)   # 5 registrations per 5 min per IP
def register():
    data    = request.get_json(silent=True) or {}
    
    # Accept both 'name' and 'full_name' (frontend compatibility)
    full_name = data.get("full_name") or data.get("name") or ""
    full_name = full_name.strip()
    
    # Set default role to 'customer' if not provided
    role = (data.get("role") or "customer").strip()
    if role not in {"customer", "driver", "restaurant"}:
        return jsonify({"error": "Registration is not allowed for this role."}), 400
    
    # Validate required fields
    missing = [f for f in ["email","password","phone"] if not data.get(f)]
    if not full_name:
        missing.append("full_name (or name)")
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    try:
        with transaction() as session:
            repo = UserRepository(session)
            user = repo.create(
                email     = data["email"],
                password  = data["password"],
                full_name = full_name,
                phone     = data["phone"],
                role      = role,
                extra     = {k: v for k, v in data.items()
                             if k not in {"email","password","full_name","name","phone","role"}},
            )
            tokens  = _generate_tokens(user.id, user.role, current_app.config["JWT_SECRET_KEY"])
            user_id = user.id
            role    = user.role
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"register: {e}")
        return jsonify({"error": "Registration failed"}), 500

    logger.info(f"New {role} registered: {data['email']}")
    return jsonify({"message": "Account created", "user_id": user_id,
                    "role": role, **tokens}), 201


@auth_bp.route("/login", methods=["POST"])
@rate_limit(limit=10, window=60)   # 10 login attempts per minute per IP
def login():
    data     = request.get_json(silent=True) or {}
    email    = (data.get("email") or "").lower().strip()
    password = data.get("password") or ""
    if not email or not password:
        return jsonify({"error": "email and password required"}), 400

    try:
        with transaction() as session:
            repo = UserRepository(session)
            user = repo.find_by_email(email)
            if not user or not repo.verify_password(password, user.password_hash):
                return jsonify({"error": "Invalid email or password"}), 401
            if not user.is_active:
                if user.role in {"restaurant", "driver"} and getattr(user, 'kyc_status', 'pending') == "pending":
                    return jsonify({"error": "Account pending approval. Please wait for activation.", "status": "pending"}), 403
                return jsonify({"error": "Account deactivated. Contact support."}), 403
            repo.record_login(user)
            tokens    = _generate_tokens(user.id, user.role, current_app.config["JWT_SECRET_KEY"], getattr(user, 'admin_type', None))
            user_data = {"user_id": user.id, "role": user.role, "full_name": user.full_name, "kyc_status": getattr(user, 'kyc_status', 'approved')}
            if getattr(user, 'admin_type', None):
                user_data["admin_type"] = user.admin_type
    except Exception as e:
        logger.error(f"login: {e}")
        return jsonify({"error": "Login failed"}), 500

    logger.info(f"Login: {email} ({user_data['role']})")
    return jsonify({**user_data, **tokens}), 200


@auth_bp.route("/refresh", methods=["POST"])
def refresh_token():
    data  = request.get_json(silent=True) or {}
    token = data.get("refresh_token") or ""
    if not token:
        return jsonify({"error": "refresh_token required"}), 400
    secret  = current_app.config["JWT_SECRET_KEY"]
    payload = _decode_token(token, secret)
    if not payload:
        return jsonify({"error": "Invalid or expired refresh token"}), 401
    if payload.get("type") != "refresh":
        return jsonify({"error": "Not a refresh token"}), 401

    # Revoke old refresh token (rotation) if session store is active
    jti = payload.get("jti")
    redis_inst = getattr(current_app, "redis", None)
    if jti and redis_inst:
        try:
            if not redis_inst.sessions.is_valid(jti):
                return jsonify({"error": "Refresh token has been revoked"}), 401
            redis_inst.sessions.revoke(jti)
        except Exception:
            pass

    return jsonify(_generate_tokens(payload["sub"], payload["role"], secret, payload.get("admin_type"))), 200


@auth_bp.route("/logout", methods=["POST"])
@require_auth()
def logout():
    raw = request.headers.get("Authorization", "")
    token = raw[7:]
    secret = current_app.config["JWT_SECRET_KEY"]
    payload = _decode_token(token, secret)
    redis_inst = getattr(current_app, "redis", None)

    if payload and "jti" in payload and redis_inst:
        try:
            redis_inst.sessions.revoke(payload["jti"])
        except Exception:
            pass

    # Revoke refresh token if supplied in body
    data = request.get_json(silent=True) or {}
    refresh_token = data.get("refresh_token")
    if refresh_token and redis_inst:
        r_payload = _decode_token(refresh_token, secret)
        if r_payload and "jti" in r_payload:
            try:
                redis_inst.sessions.revoke(r_payload["jti"])
            except Exception:
                pass

    logger.info(f"Logout: {request.user_id}")
    return jsonify({"message": "Logged out successfully"}), 200


@auth_bp.route("/me", methods=["GET"])
@require_auth()
def get_profile():
    with get_db_session() as session:
        repo = UserRepository(session)
        user = repo.get(request.user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify(repo.safe_dict(user)), 200


@auth_bp.route("/me", methods=["PATCH"])
@require_auth()
def update_profile():
    data = request.get_json(silent=True) or {}
    try:
        with transaction() as session:
            repo = UserRepository(session)
            user = repo.get_or_404(request.user_id)
            updates = {}
            if data.get("full_name"): updates["full_name"] = data["full_name"].strip()
            if data.get("phone"):     updates["phone"]     = data["phone"].strip()
            if data.get("password"):
                if len(data["password"]) < 8:
                    return jsonify({"error": "Password must be at least 8 characters"}), 400
                updates["password_hash"] = repo.hash_password(data["password"])
            if not updates:
                return jsonify({"error": "Nothing to update"}), 400
            repo.update(user, **updates)
    except LookupError as e:
        return jsonify({"error": str(e)}), 404
    return jsonify({"message": "Profile updated"}), 200


@auth_bp.route("/change-password", methods=["POST"])
@require_auth()
def change_password():
    data       = request.get_json(silent=True) or {}
    current_pw = data.get("current_password") or ""
    new_pw     = data.get("new_password")     or ""
    if not current_pw or not new_pw:
        return jsonify({"error": "current_password and new_password required"}), 400
    try:
        with transaction() as session:
            repo = UserRepository(session)
            user = repo.get_or_404(request.user_id)
            if not repo.verify_password(current_pw, user.password_hash):
                return jsonify({"error": "Current password incorrect"}), 401
            repo.update_password(user, new_pw)
    except (LookupError, ValueError) as e:
        return jsonify({"error": str(e)}), 400
    return jsonify({"message": "Password changed successfully"}), 200


# ── OTP ────────────────────────────────────────────────────────

@auth_bp.route("/otp/send", methods=["POST"])
def send_otp():
    data = request.get_json(silent=True) or {}
    phone = data.get("phone", "").strip()
    if not phone:
        return jsonify({"error": "phone required"}), 400

    code = ''.join(random.choices(string.digits, k=6))

    redis_inst = getattr(current_app, 'redis', None)
    if redis_inst:
        try:
            redis_inst.set(f"otp:{phone}", code, ex=300)
        except Exception:
            redis_inst = None

    if not redis_inst:
        if not hasattr(current_app, '_otp_store'):
            current_app._otp_store = {}
        current_app._otp_store[phone] = {
            'code': code,
            'expires': datetime.now(UTC) + timedelta(minutes=5)
        }

    mock_sms = os.getenv("MOCK_SMS", "true").lower() == "true"
    if mock_sms:
        logger.info(f"[MOCK SMS] OTP for {phone}: {code}")
        return jsonify({"message": "OTP sent", "mock_code": code}), 200

    return jsonify({"message": "OTP sent"}), 200


@auth_bp.route("/otp/verify", methods=["POST"])
def verify_otp():
    data = request.get_json(silent=True) or {}
    phone = data.get("phone", "").strip()
    code  = data.get("code", "").strip()

    if not phone or not code:
        return jsonify({"error": "phone and code required"}), 400

    redis_inst  = getattr(current_app, 'redis', None)
    stored_code = None

    if redis_inst:
        try:
            val = redis_inst.get(f"otp:{phone}")
            if val:
                stored_code = val.decode() if isinstance(val, bytes) else val
            redis_inst.delete(f"otp:{phone}")
        except Exception:
            pass
    else:
        otp_store = getattr(current_app, '_otp_store', {})
        entry = otp_store.get(phone)
        if entry:
            if entry['expires'] > datetime.now(UTC):
                stored_code = entry['code']
            del otp_store[phone]

    # Mock fallback — only accept "123456" in non-production environments
    is_prod = current_app.config.get("ENV") == "production" or os.getenv("FLASK_ENV") == "production"
    if code == "123456" and os.getenv("MOCK_SMS", "true").lower() == "true" and not is_prod:
        return jsonify({"verified": True, "message": "OTP verified"}), 200

    if stored_code and stored_code == code:
        return jsonify({"verified": True, "message": "OTP verified"}), 200

    return jsonify({"verified": False, "error": "Invalid or expired OTP"}), 400


# ── Password Recovery (Forgot/Reset Password) ───────────────

@auth_bp.route("/<user_type>/forgot-password", methods=["POST"])
@rate_limit(limit=3, window=600)  # Max 3 forgot-password requests per 10 minutes per IP
def forgot_password(user_type):
    if user_type not in {"customer", "driver", "restaurant"}:
        return jsonify({"error": "Invalid user type"}), 400

    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").lower().strip()
    if not email:
        return jsonify({"error": "email required"}), 400

    from services.email_otp_service import EmailOTPService
    from database.schemas import User

    with transaction() as session:
        user = session.query(User).filter(User.email == email, User.role == user_type).first()
        # Return 200 to prevent user enumeration
        if not user:
            return jsonify({"message": "If this email is registered, a verification code has been sent."}), 200

        # Create and send OTP code
        EmailOTPService.create_reset_otp(session, email, user.id, user_type)

    return jsonify({"message": "If this email is registered, a verification code has been sent."}), 200


@auth_bp.route("/<user_type>/verify-reset-otp", methods=["POST"])
@rate_limit(limit=10, window=300)  # Max 10 verification attempts per 5 minutes per IP
def verify_reset_otp(user_type):
    if user_type not in {"customer", "driver", "restaurant"}:
        return jsonify({"error": "Invalid user type"}), 400

    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").lower().strip()
    otp   = (data.get("otp") or "").strip()
    if not email or not otp:
        return jsonify({"error": "email and otp required"}), 400

    from services.email_otp_service import EmailOTPService

    with get_db_session() as session:
        success, error_msg = EmailOTPService.verify_otp_code(session, email, otp)
        if not success:
            return jsonify({"error": error_msg or "Invalid verification code"}), 400

    return jsonify({"verified": True, "message": "OTP verified"}), 200


@auth_bp.route("/<user_type>/reset-password", methods=["POST"])
@rate_limit(limit=5, window=300)  # Max 5 password resets per 5 minutes per IP
def reset_password(user_type):
    if user_type not in {"customer", "driver", "restaurant"}:
        return jsonify({"error": "Invalid user type"}), 400

    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").lower().strip()
    otp   = (data.get("otp") or "").strip()
    new_password = data.get("new_password") or ""
    if not email or not otp or not new_password:
        return jsonify({"error": "email, otp, and new_password required"}), 400

    if len(new_password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    from services.email_otp_service import EmailOTPService
    from database.schemas import User, SupportLog

    with transaction() as session:
        success, error_msg = EmailOTPService.verify_otp_code(session, email, otp, mark_used=True)
        if not success:
            return jsonify({"error": error_msg or "Invalid verification code"}), 400

        user = session.query(User).filter(User.email == email, User.role == user_type).first()
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Update user password
        repo = UserRepository(session)
        repo.update_password(user, new_password)

        # Invalidate OTP code
        EmailOTPService.invalidate_otp(session, email)

        # Log password reset success
        log = SupportLog(
            actor_id=user.id,
            actor_role=user_type,
            action="password_reset_success",
            target_type="user",
            target_id=user.id,
            metadata={"email": email}
        )
        session.add(log)

    return jsonify({"success": True, "message": "Password reset successfully"}), 200
