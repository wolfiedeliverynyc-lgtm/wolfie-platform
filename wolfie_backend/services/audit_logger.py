"""
╔══════════════════════════════════════════════════════════════════════════════╗
║          WOLFIE DELIVERY — services/audit_logger.py                         ║
║          Append-only audit trail for all admin & operational actions         ║
╚══════════════════════════════════════════════════════════════════════════════╝

DESIGN DECISIONS:
─────────────────
1. APPEND-ONLY: log_admin_action() only inserts — never updates or deletes.
   The SupportLog table is treated as an immutable event ledger.

2. FULL CONTEXT: Every log entry captures:
     - actor_id      → Who performed the action
     - actor_role    → Their role (admin, system, etc.)
     - action        → What they did (suspended, approved, etc.)
     - target_type   → What resource was affected (user, order, etc.)
     - target_id     → Specific resource ID
     - ip_address    → IPv4/IPv6 of the caller
     - user_agent    → Device / browser (from HTTP header)
     - request_id    → Correlation ID linking API ↔ Celery ↔ WebSocket
     - metadata      → Any extra structured context
     - created_at    → UTC timestamp (auto)

3. CORRELATION ID (request_id):
   Each Flask request gets a unique `X-Request-ID` (set in before_request).
   This ID flows through all log entries, Celery tasks, and WebSocket events
   so you can trace any full operation chain in the logs.

4. SYNC vs ASYNC:
   Writes happen inside the caller's transaction (synchronous) so that if the
   business action rolls back, the audit entry rolls back too — no phantom logs.
   A fire-and-forget async fallback is used ONLY if the DB write fails, to
   ensure the audit is never silently lost.
"""

import logging
import uuid
from datetime import datetime, timezone

from database.schemas import SupportLog

logger = logging.getLogger("wolfie.audit")
UTC    = timezone.utc


# ══════════════════════════════════════════════════════════════════════════════
# CORRELATION ID HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def generate_request_id() -> str:
    """
    Generate a short, unique correlation ID for a request.
    Format: req_<8 hex chars>   e.g.  req_a3f2b19c
    """
    return f"req_{uuid.uuid4().hex[:12]}"


def get_request_id() -> str | None:
    """
    Read the current request's correlation ID from Flask's g object.
    Returns None if called outside a request context.
    """
    try:
        from flask import g
        return getattr(g, "request_id", None)
    except RuntimeError:
        return None   # outside request context (e.g. Celery task)


# ══════════════════════════════════════════════════════════════════════════════
# MAIN AUDIT FUNCTION
# ══════════════════════════════════════════════════════════════════════════════

def log_admin_action(
    session,
    actor_id:    str,
    actor_role:  str,
    action:      str,
    target_type: str,
    target_id:   str,
    metadata:    dict = None,
    ip_address:  str  = None,
    user_agent:  str  = None,
    request_id:  str  = None,
) -> SupportLog | None:
    """
    Append an immutable audit entry to support_logs.

    MUST be called inside an active transaction — does NOT commit.
    The entry is committed atomically together with the business action.

    Args:
        session     : Active SQLAlchemy session (within transaction() block).
        actor_id    : ID of the user performing the action.
        actor_role  : Role of the actor (e.g. 'admin', 'system').
        action      : Human-readable action name (e.g. 'suspended', 'approved').
        target_type : Type of affected resource (e.g. 'user', 'order').
        target_id   : ID of the affected resource.
        metadata    : Optional dict of extra context.
        ip_address  : IP of the HTTP caller (auto-read from Flask request if omitted).
        user_agent  : Device/browser string (auto-read from Flask request if omitted).
        request_id  : Correlation ID (auto-read from Flask g if omitted).

    Returns:
        SupportLog instance, or None if something prevented the write.
    """
    # ── Auto-populate from Flask request context where possible ──────────────
    try:
        from flask import request as flask_request, g
        if ip_address is None:
            ip_address = flask_request.headers.get("X-Forwarded-For",
                         flask_request.remote_addr)
        if user_agent is None:
            user_agent = flask_request.headers.get("User-Agent", "")
        if request_id is None:
            request_id = getattr(g, "request_id", None)
    except RuntimeError:
        pass   # Not in a Flask request context — that's fine (e.g. Celery task)

    try:
        log_entry = SupportLog(
            actor_id    = actor_id,
            actor_role  = actor_role,
            action      = action,
            target_type = target_type,
            target_id   = target_id,
            meta_data   = metadata or {},
            ip_address  = ip_address,
            user_agent  = user_agent,
            request_id  = request_id,
            created_at  = datetime.now(UTC),
        )
        session.add(log_entry)
        logger.debug(
            f"[Audit] actor={actor_id} role={actor_role} "
            f"action={action} target={target_type}:{target_id} "
            f"req={request_id}"
        )
        return log_entry

    except Exception as e:
        # Audit write failed — log loudly but never crash the caller.
        logger.error(
            f"[Audit FAILED] action={action} target={target_type}:{target_id} "
            f"actor={actor_id} error={e}"
        )
        # Fire-and-forget fallback: write to structured log so ops can replay
        _emit_fallback_log(
            actor_id=actor_id, actor_role=actor_role,
            action=action, target_type=target_type, target_id=target_id,
            metadata=metadata, ip_address=ip_address,
            user_agent=user_agent, request_id=request_id,
        )
        return None


# ══════════════════════════════════════════════════════════════════════════════
# GUARDS — Prevent accidental mutation of audit records
# ══════════════════════════════════════════════════════════════════════════════

def delete_audit_log(*args, **kwargs):
    """
    Intentionally blocked — audit logs are immutable.
    Raises RuntimeError to prevent accidental deletion in application code.
    """
    raise RuntimeError(
        "Audit logs are append-only and must never be deleted from application code. "
        "Use a DB-level archival policy if you need to rotate old entries."
    )


def update_audit_log(*args, **kwargs):
    """
    Intentionally blocked — audit logs are immutable.
    Raises RuntimeError to prevent accidental updates in application code.
    """
    raise RuntimeError(
        "Audit logs are append-only and must never be updated. "
        "If a log entry needs correction, append a new corrective entry instead."
    )


# ══════════════════════════════════════════════════════════════════════════════
# FALLBACK — Structured JSON log when DB write fails
# ══════════════════════════════════════════════════════════════════════════════

def _emit_fallback_log(**kwargs):
    """
    If the DB write fails, emit the audit data as a structured JSON log line.
    This allows ops to grep/parse logs and replay missed entries.
    """
    import json
    try:
        payload = {
            "audit_fallback": True,
            "ts": datetime.now(UTC).isoformat(),
            **{k: v for k, v in kwargs.items() if v is not None},
        }
        logger.critical(f"[Audit Fallback] {json.dumps(payload, default=str)}")
    except Exception:
        pass   # absolute last resort — don't crash


# ══════════════════════════════════════════════════════════════════════════════
# FLASK HOOK — Register correlation ID middleware
# ══════════════════════════════════════════════════════════════════════════════

def register_correlation_id_middleware(app):
    """
    Call this once in app.py to activate X-Request-ID correlation tracking.

    What it does:
    - On every request: reads X-Request-ID header (or generates one).
    - Stores it in Flask's `g.request_id` so log_admin_action() picks it up.
    - Adds the ID to every response header so the frontend / API clients can
      include it in bug reports.

    Usage in app.py:
        from services.audit_logger import register_correlation_id_middleware
        register_correlation_id_middleware(app)
    """
    @app.before_request
    def _assign_request_id():
        from flask import g, request as req
        # Honour an incoming ID (from API gateway / frontend) or generate new
        g.request_id = req.headers.get("X-Request-ID") or generate_request_id()

    @app.after_request
    def _attach_request_id(response):
        from flask import g
        rid = getattr(g, "request_id", None)
        if rid:
            response.headers["X-Request-ID"] = rid
        return response

    logger.info("✅ Correlation ID middleware registered (X-Request-ID)")
