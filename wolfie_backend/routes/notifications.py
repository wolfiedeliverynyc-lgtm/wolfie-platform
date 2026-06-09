"""
╔══════════════════════════════════════════════════════════════╗
║   WOLFIE DELIVERY — routes/notifications.py                  ║
║   REST endpoints for the customer notification feed          ║
╚══════════════════════════════════════════════════════════════╝
"""

import logging
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, current_app
from routes.auth import require_auth
from database import transaction, get_db_session
from database.schemas import Notification, User

notifications_bp = Blueprint("notifications", __name__)
logger = logging.getLogger("wolfie")

# ──────────────────────────────────────────────────────────────
# Public helper — called by other routes / state machine hooks
# ──────────────────────────────────────────────────────────────
def push_notification(user_id: str, *, type_: str, title: str, body: str,
                      icon: str = "bell", order_id: str = None, link: str = None):
    """
    Add a notification to the user's feed AND broadcast via Socket.IO.
    """
    try:
        with transaction() as session:
            notif = Notification(
                user_id=user_id,
                type=type_,
                title=title,
                body=body,
                icon=icon,
                order_id=order_id,
                link=link
            )
            session.add(notif)
            session.flush()
            
            notif_dict = {
                "id":         notif.id,
                "user_id":    notif.user_id,
                "type":       notif.type,
                "title":      notif.title,
                "body":       notif.body,
                "icon":       notif.icon,
                "order_id":   notif.order_id,
                "link":       notif.link,
                "read":       notif.is_read,
                "created_at": notif.created_at.isoformat(),
            }

        # Broadcast in real-time to user's personal room
        try:
            from flask import current_app
            socketio = current_app.extensions.get("socketio")
            if not socketio:
                from app import socketio
            socketio.emit("notification", notif_dict, room=f"user_{user_id}", namespace="/")
        except Exception as e:
            logger.warning(f"Notification broadcast failed: {e}")

        return notif_dict
    except Exception as e:
        logger.error(f"Failed to push notification: {e}")
        return None


# ──────────────────────────────────────────────────────────────
# REST ROUTES
# ──────────────────────────────────────────────────────────────

@notifications_bp.route("/", methods=["GET"])
@require_auth(["customer", "admin", "driver", "restaurant"])
def list_notifications():
    """GET /api/v1/notifications/ — return all notifications for current user."""
    user_id = request.user_id
    limit   = int(request.args.get("limit", 30))
    with get_db_session() as session:
        notifs = session.query(Notification).filter_by(user_id=user_id).order_by(Notification.created_at.desc()).limit(limit).all()
        unread = session.query(Notification).filter_by(user_id=user_id, is_read=False).count()
        
        return jsonify({
            "notifications": [{
                "id": n.id,
                "type": n.type,
                "title": n.title,
                "body": n.body,
                "icon": n.icon,
                "order_id": n.order_id,
                "link": n.link,
                "read": n.is_read,
                "created_at": n.created_at.isoformat()
            } for n in notifs],
            "unread": unread
        }), 200


@notifications_bp.route("/read", methods=["POST"])
@require_auth(["customer", "admin", "driver", "restaurant"])
def mark_read():
    """POST /api/v1/notifications/read  body: { ids: [...] } or {} for all."""
    user_id = request.user_id
    data    = request.get_json(silent=True) or {}
    ids     = data.get("ids")       # list of notif ids, or None → mark all

    with transaction() as session:
        query = session.query(Notification).filter_by(user_id=user_id, is_read=False)
        if ids:
            query = query.filter(Notification.id.in_(ids))
            
        query.update({"is_read": True}, synchronize_session=False)

    return jsonify({"ok": True}), 200


@notifications_bp.route("/clear", methods=["DELETE"])
@require_auth(["customer", "admin", "driver", "restaurant"])
def clear_notifications():
    """DELETE /api/v1/notifications/clear — wipe all."""
    with transaction() as session:
        session.query(Notification).filter_by(user_id=request.user_id).delete(synchronize_session=False)
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
    user_id = data.get("user_id")   # None → broadcast to all users

    if user_id:
        push_notification(user_id, type_=type_, title=title, body=body_)
    else:
        with get_db_session() as session:
            users = session.query(User.id).all()
            for (uid,) in users:
                push_notification(uid, type_=type_, title=title, body=body_)

    return jsonify({"ok": True}), 200
