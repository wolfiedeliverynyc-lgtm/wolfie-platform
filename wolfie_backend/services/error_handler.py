"""
╔══════════════════════════════════════════════════════════════╗
║  WOLFIE DELIVERY — error_handler.py                          ║
║  Standardized enterprise error handling with codes,         ║
║  correlation tracking, and retry categorization.            ║
╚══════════════════════════════════════════════════════════════╝
"""

import logging
import traceback
from datetime import datetime, timezone
from functools import wraps
from flask import jsonify, request
from services.audit_logger import get_request_id

logger = logging.getLogger("wolfie")
UTC    = timezone.utc


# ══════════════════════════════════════════════════════════════════════════════
# UNIFIED SYSTEM ERROR CODES (Observation 1)
# ══════════════════════════════════════════════════════════════════════════════
# AUTH_xxx: Authentication, Authorization, & Sessions
# ORDER_xxx: Resource validation, states, & routing
# PAYMENT_xxx: Payments & business rules
# SYSTEM_xxx: System/Internal timeouts, availability, & external dependencies
# VALIDATION_xxx: Request schema & input validation

ERROR_CODES = {
    "WolfieError": "SYSTEM_001",
    "NotFoundError": "ORDER_013",
    "UnauthorizedError": "AUTH_001",
    "ForbiddenError": "AUTH_002",
    "ValidationError": "VALIDATION_001",
    "PaymentError": "PAYMENT_004",
    "ServiceUnavailableError": "SYSTEM_003",
    "ExternalServiceError": "SYSTEM_002",
}


# ══════════════════════════════════════════════════════════════════════════════
# CUSTOM IMMUTABLE EXCEPTIONS
# ══════════════════════════════════════════════════════════════════════════════

class WolfieError(Exception):
    """Base application exception."""
    status_code = 400
    is_retryable = False   # Classification (Observation 4)

    def __init__(self, message: str, code: int = None, error_code: str = None):
        self.message      = message
        self.status_code  = code or self.__class__.status_code
        self.error_code   = error_code or ERROR_CODES.get(self.__class__.__name__, "SYSTEM_001")
        super().__init__(message)


class NotFoundError(WolfieError):
    status_code = 404
    is_retryable = False


class UnauthorizedError(WolfieError):
    status_code = 401
    is_retryable = False


class ForbiddenError(WolfieError):
    status_code = 403
    is_retryable = False


class ValidationError(WolfieError):
    status_code = 422
    is_retryable = False


class PaymentError(WolfieError):
    status_code = 402
    is_retryable = False


class ServiceUnavailableError(WolfieError):
    status_code = 503
    is_retryable = True   # Classify as retryable for background tasks (Observation 4)


class ExternalServiceError(WolfieError):
    """
    Masks detailed errors from external dependencies (Observation 2).
    Keeps full traceback internal, returns generic message to caller.
    """
    status_code = 502
    is_retryable = True

    def __init__(self, service_name: str, detailed_message: str, is_retryable: bool = True):
        self.service_name = service_name
        self.detailed_message = detailed_message
        self.is_retryable = is_retryable
        super().__init__(
            message=f"An issue occurred with an external partner service ({service_name}). Support has been notified.",
            code=502
        )


# ══════════════════════════════════════════════════════════════════════════════
# HELPER FOR ROUTE-LEVEL HANDLERS
# ══════════════════════════════════════════════════════════════════════════════

def make_error_response(message: str, code: str, status_code: int):
    """Generate a standardized Flask JSON response for manual error returns."""
    req_id = get_request_id()
    return jsonify({
        "code": code,
        "message": message,
        "trace_id": req_id,
        "error": message,
        "error_code": code,
        "request_id": req_id
    }), status_code


# ══════════════════════════════════════════════════════════════════════════════
# REGISTER WITH FLASK APPLICATION
# ══════════════════════════════════════════════════════════════════════════════

def register_error_handlers(app):

    @app.errorhandler(WolfieError)
    def handle_wolfie_error(e: WolfieError):
        _log_error(e, level="warning" if not e.is_retryable else "error")
        req_id = get_request_id()   # Correlation (Observation 3)
        return jsonify({
            "code": e.error_code,
            "message": e.message,
            "trace_id": req_id,
            "error": e.message,
            "error_code": e.error_code,
            "request_id": req_id,
            "is_retryable": e.is_retryable
        }), e.status_code

    @app.errorhandler(400)
    def bad_request(e):
        req_id = get_request_id()
        return jsonify({
            "code": "VALIDATION_001",
            "message": "Bad request",
            "trace_id": req_id,
            "error": "Bad request",
            "error_code": "VALIDATION_001",
            "request_id": req_id
        }), 400

    @app.errorhandler(401)
    def unauthorized(e):
        req_id = get_request_id()
        return jsonify({
            "code": "AUTH_001",
            "message": "Unauthorized",
            "trace_id": req_id,
            "error": "Unauthorized",
            "error_code": "AUTH_001",
            "request_id": req_id
        }), 401

    @app.errorhandler(403)
    def forbidden(e):
        req_id = get_request_id()
        return jsonify({
            "code": "AUTH_002",
            "message": "Forbidden",
            "trace_id": req_id,
            "error": "Forbidden",
            "error_code": "AUTH_002",
            "request_id": req_id
        }), 403

    @app.errorhandler(404)
    def not_found(e):
        req_id = get_request_id()
        return jsonify({
            "code": "ORDER_013",
            "message": f"Route not found: {request.path}",
            "trace_id": req_id,
            "error": f"Route not found: {request.path}",
            "error_code": "ORDER_013",
            "request_id": req_id
        }), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        req_id = get_request_id()
        return jsonify({
            "code": "SYSTEM_001",
            "message": f"Method {request.method} not allowed",
            "trace_id": req_id,
            "error": f"Method {request.method} not allowed",
            "error_code": "SYSTEM_001",
            "request_id": req_id
        }), 405

    @app.errorhandler(429)
    def rate_limited(e):
        req_id = get_request_id()
        return jsonify({
            "code": "SYSTEM_003",
            "message": "Too many requests. Slow down.",
            "trace_id": req_id,
            "error": "Too many requests. Slow down.",
            "error_code": "SYSTEM_003",
            "request_id": req_id
        }), 429

    @app.errorhandler(500)
    def server_error(e):
        _log_error(e, level="error")
        req_id = get_request_id()
        return jsonify({
            "code": "SYSTEM_001",
            "message": "Internal server error",
            "trace_id": req_id,
            "error": "Internal server error",
            "error_code": "SYSTEM_001",
            "request_id": req_id
        }), 500

    @app.errorhandler(Exception)
    def unhandled_exception(e):
        _log_error(e, level="error")
        req_id = get_request_id()
        return jsonify({
            "code": "SYSTEM_001",
            "message": "Unexpected error occurred",
            "trace_id": req_id,
            "error": "Unexpected error occurred",
            "error_code": "SYSTEM_001",
            "request_id": req_id
        }), 500

    logger.info("✅ Standardized error handlers registered")


# ══════════════════════════════════════════════════════════════════════════════
# DECORATOR FOR ROUTE-LEVEL HANDLERS
# ══════════════════════════════════════════════════════════════════════════════

def handle_errors(f):
    """Wrap a route function — catches any exception, returns standardized JSON."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        req_id = get_request_id()
        try:
            return f(*args, **kwargs)
        except WolfieError as e:
            return jsonify({
                "code": e.error_code,
                "message": e.message,
                "trace_id": req_id,
                "error": e.message,
                "error_code": e.error_code,
                "request_id": req_id,
                "is_retryable": e.is_retryable
            }), e.status_code
        except Exception as e:
            logger.error(f"Unhandled in {f.__name__} [req={req_id}]: {e}\n{traceback.format_exc()}")
            return jsonify({
                "code": "SYSTEM_001",
                "message": "Internal server error",
                "trace_id": req_id,
                "error": "Internal server error",
                "error_code": "SYSTEM_001",
                "request_id": req_id
            }), 500
    return wrapper


# ══════════════════════════════════════════════════════════════════════════════
# INTERNAL LOGGING FORMATTING
# ══════════════════════════════════════════════════════════════════════════════

def _log_error(e: Exception, level: str = "error"):
    req_id = get_request_id()
    msg = f"[{request.method}] {request.path} [req={req_id}] → {type(e).__name__}"

    if isinstance(e, ExternalServiceError):
        msg += f" (Partner Service: {e.service_name}, Detailed error: {e.detailed_message})"
    else:
        msg += f": {e}"

    if level == "warning":
        logger.warning(msg)
    else:
        logger.error(f"{msg}\n{traceback.format_exc()}")
