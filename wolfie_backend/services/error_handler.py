"""
╔══════════════════════════════════════════════════════════════╗
║  WOLFIE DELIVERY — error_handler.py                          ║
║  Compatible with app.py:                                     ║
║      register_error_handlers(app)                            ║
╚══════════════════════════════════════════════════════════════╝
"""

import logging
import traceback
from datetime import datetime, timezone
from functools import wraps
from flask import jsonify, request

logger = logging.getLogger("wolfie")
UTC    = timezone.utc


# ── Custom exceptions ─────────────────────────────────────────

class WolfieError(Exception):
    status_code = 400
    def __init__(self, message: str, code: int = None):
        self.message     = message
        self.status_code = code or self.__class__.status_code
        super().__init__(message)

class NotFoundError(WolfieError):
    status_code = 404

class UnauthorizedError(WolfieError):
    status_code = 401

class ForbiddenError(WolfieError):
    status_code = 403

class ValidationError(WolfieError):
    status_code = 422

class PaymentError(WolfieError):
    status_code = 402

class ServiceUnavailableError(WolfieError):
    status_code = 503


# ── Register with Flask app ───────────────────────────────────

def register_error_handlers(app):

    @app.errorhandler(WolfieError)
    def handle_wolfie_error(e: WolfieError):
        _log_error(e, level="warning")
        return jsonify({"error": e.message, "code": e.status_code}), e.status_code

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": "Bad request", "code": 400}), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({"error": "Unauthorized", "code": 401}), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({"error": "Forbidden", "code": 403}), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": f"Route not found: {request.path}", "code": 404}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": f"Method {request.method} not allowed", "code": 405}), 405

    @app.errorhandler(429)
    def rate_limited(e):
        return jsonify({"error": "Too many requests. Slow down.", "code": 429}), 429

    @app.errorhandler(500)
    def server_error(e):
        _log_error(e, level="error")
        return jsonify({"error": "Internal server error", "code": 500}), 500

    @app.errorhandler(Exception)
    def unhandled_exception(e):
        _log_error(e, level="error")
        return jsonify({"error": "Unexpected error occurred", "code": 500}), 500

    logger.info("✅ Error handlers registered")


# ── Decorator for route-level error handling ──────────────────

def handle_errors(f):
    """Wrap a route function — catches any exception, returns JSON."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except WolfieError as e:
            return jsonify({"error": e.message}), e.status_code
        except Exception as e:
            logger.error(f"Unhandled in {f.__name__}: {e}\n{traceback.format_exc()}")
            return jsonify({"error": "Internal server error"}), 500
    return wrapper


# ── Internal logging ──────────────────────────────────────────

def _log_error(e: Exception, level: str = "error"):
    msg = f"[{request.method}] {request.path} → {type(e).__name__}: {e}"
    if level == "warning":
        logger.warning(msg)
    else:
        logger.error(f"{msg}\n{traceback.format_exc()}")
