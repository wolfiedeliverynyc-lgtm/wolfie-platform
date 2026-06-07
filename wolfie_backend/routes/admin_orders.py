"""
Admin Orders Operations
"""
import logging
from flask import Blueprint, request, jsonify
from routes.auth import require_auth
from database import transaction, get_db_session
from database.repositories import OrderRepository
from services.audit_logger import log_admin_action

admin_orders_bp = Blueprint("admin_orders", __name__)
logger = logging.getLogger("wolfie")

@admin_orders_bp.route("/orders", methods=["GET"])
@require_auth(["admin"], admin_types=["super_admin", "operations_admin"])
def list_orders():
    status = request.args.get("status")
    limit  = int(request.args.get("limit", 50))
    offset = int(request.args.get("offset", 0))
    with get_db_session() as session:
        repo = OrderRepository(session)
        orders = repo.find_by_status(status, limit, offset) if status else repo.list(limit=limit, offset=offset)
        return jsonify({
            "orders": [repo.to_dict(o) for o in orders],
            "count": len(orders)
        }), 200

@admin_orders_bp.route("/orders/<order_id>", methods=["GET"])
@require_auth(["admin"], admin_types=["super_admin", "operations_admin"])
def get_order(order_id):
    with get_db_session() as session:
        repo = OrderRepository(session)
        order = repo.get(order_id)
        if not order:
            return jsonify({"error": "Order not found"}), 404
        return jsonify(repo.to_dict(order)), 200

@admin_orders_bp.route("/orders/<order_id>/cancel", methods=["POST"])
@require_auth(["admin"], admin_types=["super_admin", "operations_admin"])
def cancel_order(order_id):
    data = request.get_json(silent=True) or {}
    reason = data.get("reason", "Admin cancelled")
    try:
        with transaction() as session:
            repo = OrderRepository(session)
            order = repo.get_or_404(order_id)
            repo.transition(order, "cancelled", actor_role="admin", actor_id=request.user_id, force=True)
            order.cancellation_reason = reason
            
            # Log action
            log_admin_action(
                session, actor_id=request.user_id, actor_role=request.user_role,
                action="cancel_order", target_type="order", target_id=order_id,
                metadata={"reason": reason}
            )
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    
    return jsonify({"message": "Order cancelled", "order_id": order_id}), 200

@admin_orders_bp.route("/orders/<order_id>/reassign", methods=["POST"])
@require_auth(["admin"], admin_types=["super_admin", "operations_admin"])
def reassign_driver(order_id):
    data = request.get_json(silent=True) or {}
    new_driver_id = data.get("driver_id")
    if not new_driver_id:
        return jsonify({"error": "driver_id required"}), 400
    
    try:
        with transaction() as session:
            repo = OrderRepository(session)
            order = repo.get_or_404(order_id)
            old_driver_id = order.driver_id
            order.driver_id = new_driver_id
            
            # Log action
            log_admin_action(
                session, actor_id=request.user_id, actor_role=request.user_role,
                action="reassign_driver", target_type="order", target_id=order_id,
                metadata={"old_driver_id": old_driver_id, "new_driver_id": new_driver_id}
            )
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    
    return jsonify({"message": "Driver reassigned", "order_id": order_id}), 200

@admin_orders_bp.route("/orders/<order_id>/force-complete", methods=["POST"])
@require_auth(["admin"], admin_types=["super_admin", "operations_admin"])
def force_complete_order(order_id):
    try:
        with transaction() as session:
            repo = OrderRepository(session)
            order = repo.get_or_404(order_id)
            repo.transition(order, "delivered", actor_role="admin", actor_id=request.user_id, force=True)
            
            # Log action
            log_admin_action(
                session, actor_id=request.user_id, actor_role=request.user_role,
                action="force_complete_order", target_type="order", target_id=order_id
            )
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    
    return jsonify({"message": "Order forcefully completed", "order_id": order_id}), 200
