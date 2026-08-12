from flask import Blueprint, request, jsonify
from routes.auth import require_auth
from database import transaction, get_db_session
from database.schemas import ChatMessage, Order

chat_bp = Blueprint("chat", __name__)

@chat_bp.route("/<order_id>/messages", methods=["GET"])
@require_auth()
def get_chat_history(order_id):
    session = get_db_session()
    # Check if order exists
    order = session.query(Order).filter(Order.id == order_id).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404

    # Authorization check: user must be customer, driver, or restaurant of the order
    if request.user_id not in [order.customer_id, order.driver_id, order.restaurant_id] and request.user_role != "admin":
        return jsonify({"error": "Unauthorized to view this chat"}), 403

    page     = int(request.args.get("page", 1))
    per_page = min(int(request.args.get("per_page", 50)), 200)
    offset   = (page - 1) * per_page

    messages = session.query(ChatMessage).filter(ChatMessage.order_id == order_id).order_by(ChatMessage.created_at.asc()).limit(per_page).offset(offset).all()
    
    from sqlalchemy import func
    import math
    total = session.query(func.count(ChatMessage.id)).filter(ChatMessage.order_id == order_id).scalar()
    
    return jsonify({
        "messages": [{
            "id": m.id,
            "order_id": m.order_id,
            "sender_id": m.sender_id,
            "sender_type": m.sender_type,
            "message": m.message,
            "is_read": m.is_read,
            "created_at": m.created_at.isoformat()
        } for m in messages],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "pages": math.ceil(total / per_page) if total else 0
        }
    }), 200

@chat_bp.route("/<order_id>", methods=["POST"])
@require_auth()
def persist_message(order_id):
    data = request.get_json(silent=True) or {}
    message = data.get("message", "").strip()
    if not message:
        return jsonify({"error": "message is required"}), 400

    session = get_db_session()
    order = session.query(Order).filter(Order.id == order_id).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404

    # Authorization check
    if request.user_id not in [order.customer_id, order.driver_id, order.restaurant_id] and request.user_role != "admin":
        return jsonify({"error": "Unauthorized to message this room"}), 403

    with transaction() as tx_session:
        new_msg = ChatMessage(
            order_id=order_id,
            sender_id=request.user_id,
            sender_type=request.user_role if request.user_role in ["customer", "driver"] else "restaurant",
            message=message,
            is_read=False
        )
        tx_session.add(new_msg)
        tx_session.flush()

        return jsonify({
            "id": new_msg.id,
            "order_id": new_msg.order_id,
            "sender_id": new_msg.sender_id,
            "sender_type": new_msg.sender_type,
            "message": new_msg.message,
            "is_read": new_msg.is_read,
            "created_at": new_msg.created_at.isoformat()
        }), 201
