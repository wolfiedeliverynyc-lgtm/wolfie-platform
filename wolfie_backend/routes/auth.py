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
from database.repositories import UserRepository

auth_bp = Blueprint("auth", __name__)
logger  = logging.getLogger("wolfie")
UTC     = timezone.utc


# ── Token helpers ─────────────────────────────────────────────

def _generate_tokens(user_id: str, role: str, secret: str, admin_type: str = None) -> dict:
    now = datetime.now(UTC)
    access_payload = {
        "sub": user_id, "role": role, "iat": now,
        "exp": now + timedelta(hours=24), "type": "access",
    }
    refresh_payload = {
        "sub": user_id, "role": role, "iat": now,
        "exp": now + timedelta(days=30), "type": "refresh",
    }
    if admin_type:
        access_payload["admin_type"] = admin_type
        refresh_payload["admin_type"] = admin_type

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
                return jsonify({"error": "Missing or invalid Authorization header"}), 401
            payload = _decode_token(raw[7:], current_app.config["JWT_SECRET_KEY"])
            if not payload:
                return jsonify({"error": "Token expired or invalid"}), 401
            if payload.get("type") != "access":
                return jsonify({"error": "Refresh token cannot be used here"}), 401
            if roles and payload.get("role") not in roles:
                return jsonify({"error": "Insufficient permissions"}), 403
            
            # Check admin_type if requested
            if admin_types and payload.get("role") == "admin":
                if payload.get("admin_type") not in admin_types:
                    # Allow super_admin to access everything
                    if payload.get("admin_type") != "super_admin":
                        return jsonify({"error": "Insufficient admin permissions"}), 403

            request.user_id   = payload["sub"]
            request.user_role = payload["role"]
            request.admin_type = payload.get("admin_type")

            # ---- COMPLIANCE ENFORCEMENT ----
            # Do not block auth routes or explicitly exempted routes
            if request.endpoint and not (request.endpoint.startswith("auth.") or request.endpoint.startswith("legal.")):
                try:
                    from services.compliance_manager import ComplianceManager
                    with get_db_session() as session:
                        comp_mgr = ComplianceManager(session)
                        comp_state = comp_mgr.evaluate_user_compliance(request.user_id, request.user_role)
                        if comp_state == "update_required":
                            return jsonify({"error": "Policy Update Required", "code": "COMPLIANCE_REQUIRED"}), 403
                        elif comp_state == "suspended_due_to_compliance":
                            return jsonify({"error": "Account suspended due to compliance issues", "code": "COMPLIANCE_SUSPENDED"}), 403
                except Exception as e:
                    logger.error(f"Compliance enforcement error: {e}")

            return f(*args, **kwargs)
        return wrapped
    return decorator


# ══════════════════════════════════════════════════════════════

@auth_bp.route("/register", methods=["POST"])
@rate_limit(limit=5, window=300)   # 5 registrations per 5 min per IP
def register():
    data    = request.get_json(silent=True) or {}
    missing = [f for f in ["email","password","full_name","phone","role"] if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    try:
        with transaction() as session:
            repo = UserRepository(session)
            user = repo.create(
                email     = data["email"],
                password  = data["password"],
                full_name = data["full_name"],
                phone     = data["phone"],
                role      = data["role"],
                extra     = {k: v for k, v in data.items()
                             if k not in {"email","password","full_name","phone","role"}},
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
                return jsonify({"error": "Account deactivated. Contact support."}), 403
            repo.record_login(user)
            tokens    = _generate_tokens(user.id, user.role, current_app.config["JWT_SECRET_KEY"], getattr(user, 'admin_type', None))
            user_data = {"user_id": user.id, "role": user.role, "full_name": user.full_name}
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
    return jsonify(_generate_tokens(payload["sub"], payload["role"], secret, payload.get("admin_type"))), 200


@auth_bp.route("/logout", methods=["POST"])
@require_auth()
def logout():
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
        except Exception:
            pass

    if stored_code is None:
        otp_store = getattr(current_app, '_otp_store', {})
        entry = otp_store.get(phone)
        if entry and entry['expires'] > datetime.now(UTC):
            stored_code = entry['code']

    # Mock fallback — always accept "123456" in dev
    if code == "123456" and os.getenv("MOCK_SMS", "true").lower() == "true":
        return jsonify({"verified": True, "message": "OTP verified"}), 200

    if stored_code and stored_code == code:
        return jsonify({"verified": True, "message": "OTP verified"}), 200

    return jsonify({"verified": False, "error": "Invalid or expired OTP"}), 400
