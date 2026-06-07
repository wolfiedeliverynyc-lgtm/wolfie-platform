"""
╔══════════════════════════════════════════════════════════════╗
║   WOLFIE DELIVERY — routes/notifications.py                  ║
║   REST endpoints for the customer notification feed          ║
╚══════════════════════════════════════════════════════════════╝
"""

import logging
import json
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, current_app
from routes.auth import require_auth

notifications_bp = Blueprint("notifications", __name__)
logger = logging.getLogger("wolfie")


# ──────────────────────────────────────────────────────────────
# In-memory store (replace with DB table in production)
# For now this persists per-process restart only
# ──────────────────────────────────────────────────────────────
_notif_store: dict[str, list] = {}   # user_id → list of notification dicts


def _get_store(user_id: str) -> list:
    return _notif_store.setdefault(user_id, [])


def _notif_id() -> str:
    import uuid
    return str(uuid.uuid4())[:8]


# ──────────────────────────────────────────────────────────────
# Public helper — called by other routes / state machine hooks
# ──────────────────────────────────────────────────────────────
def push_notification(user_id: str, *, type_: str, title: str, body: str,
                      icon: str = "bell", order_id: str = None, link: str = None):
    """
    Add a notification to the user's feed AND broadcast via Socket.IO.
    type_ values:
        order_placed | order_confirmed | order_preparing | order_picked_up |
        order_delivered | order_cancelled | payment_failed | payment_success |
        driver_assigned | offer | info
    """
    notif = {
        "id":         _notif_id(),
        "user_id":    user_id,
        "type":       type_,
        "title":      title,
        "body":       body,
        "icon":       icon,
        "order_id":   order_id,
        "link":       link,
        "read":       False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    store = _get_store(user_id)
    store.insert(0, notif)          # newest first
    if len(store) > 50:             # keep last 50
        store.pop()

    # Broadcast in real-time to user's personal room
    try:
        from app import socketio
        socketio.emit("notification", notif, room=f"user_{user_id}")
    except Exception as e:
        logger.warning(f"Notification broadcast failed: {e}")

    return notif


# ──────────────────────────────────────────────────────────────
# REST ROUTES
# ──────────────────────────────────────────────────────────────

@notifications_bp.route("/", methods=["GET"])
@require_auth(["customer", "admin"])
def list_notifications():
    """GET /api/v1/notifications/ — return all notifications for current user."""
    user_id = request.user_id
    limit   = int(request.args.get("limit", 30))
    notifs  = _get_store(user_id)[:limit]
    unread  = sum(1 for n in notifs if not n["read"])
    return jsonify({"notifications": notifs, "unread": unread}), 200


@notifications_bp.route("/read", methods=["POST"])
@require_auth(["customer", "admin"])
def mark_read():
    """POST /api/v1/notifications/read  body: { ids: [...] } or {} for all."""
    user_id = request.user_id
    data    = request.get_json(silent=True) or {}
    ids     = data.get("ids")       # list of notif ids, or None → mark all
    store   = _get_store(user_id)

    for notif in store:
        if ids is None or notif["id"] in ids:
            notif["read"] = True

    return jsonify({"ok": True}), 200


@notifications_bp.route("/clear", methods=["DELETE"])
@require_auth(["customer", "admin"])
def clear_notifications():
    """DELETE /api/v1/notifications/clear — wipe all."""
    _notif_store[request.user_id] = []
    return jsonify({"ok": True}), 200


@notifications_bp.route("/system", methods=["POST"])
@require_auth(["admin"])
def send_system_notification():
    """
    POST /api/v1/notifications/system
    Admin sends a broadcast notification to one or all users.
    body: { user_id: str|null, type: str, title: str, body: str }
    """
    data    = request.get_json(silent=True) or {}
    type_   = data.get("type", "info")
    title   = data.get("title", "Wolfie")
    body_   = data.get("body", "")
    user_id = data.get("user_id")   # None → broadcast to all users in store

    if user_id:
        push_notification(user_id, type_=type_, title=title, body=body_)
    else:
        for uid in list(_notif_store.keys()):
            push_notification(uid, type_=type_, title=title, body=body_)

    return jsonify({"ok": True}), 200
