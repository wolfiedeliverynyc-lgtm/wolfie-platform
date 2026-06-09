"""
Admin Orders Operations
"""
import logging
from flask import Blueprint, request, jsonify
from routes.auth import require_auth
from database import transaction, get_db_session
from database.repositories import OrderRepository, UserRepository
from services.audit_logger import log_admin_action

admin_orders_bp = Blueprint("admin_orders", __name__)
logger = logging.getLogger("wolfie")

@admin_orders_bp.route("/orders", methods=["GET"])
def list_orders():
    status = request.args.get("status")
    limit  = int(request.args.get("limit", 50))
    offset = int(request.args.get("offset", 0))
    with get_db_session() as session:
        repo = OrderRepository(session)
        user_repo = UserRepository(session)
        orders = repo.find_by_status(status, limit, offset) if status else repo.list(limit=limit, offset=offset)
        
        result = []
        for o in orders:
            o_dict = repo.to_dict(o)
            o_dict["amount"] = o.total
            o_dict["currency"] = "DA"
            
            # Fetch customer
            if getattr(o, "customer_id", None):
                cust = user_repo.get(o.customer_id)
                if cust:
                    o_dict["customer_name"] = cust.full_name
            
            # Fetch merchant
            if getattr(o, "restaurant_id", None):
                merch = user_repo.get(o.restaurant_id)
                if merch:
                    o_dict["merchant_name"] = getattr(merch, "restaurant_name", None) or merch.full_name
                    o_dict["merchant_address"] = getattr(merch, "address", None) or merch.phone
                    o_dict["merchant_lat"] = getattr(merch, "latitude", None)
                    o_dict["merchant_lng"] = getattr(merch, "longitude", None)
                    zones = getattr(merch, "delivery_zones", [])
                    o_dict["zone"] = zones[0] if zones and len(zones) > 0 else "Algiers Centre"
                    
            # Fetch driver
            if getattr(o, "driver_id", None):
                driver = user_repo.get(o.driver_id)
                if driver:
                    o_dict["driver_name"] = driver.full_name

            result.append(o_dict)

        return jsonify({
            "orders": result,
            "count": len(orders)
        }), 200

@admin_orders_bp.route("/orders/<order_id>", methods=["GET"])
def get_order(order_id):
    with get_db_session() as session:
        repo = OrderRepository(session)
        user_repo = UserRepository(session)
        order = repo.get(order_id)
        if not order:
            return jsonify({"error": "Order not found"}), 404
            
        o_dict = repo.to_dict(order)
        o_dict["amount"] = order.total
        o_dict["currency"] = "DA"
        
        if getattr(order, "customer_id", None):
            cust = user_repo.get(order.customer_id)
            if cust:
                o_dict["customer_name"] = cust.full_name
                
        if getattr(order, "restaurant_id", None):
            merch = user_repo.get(order.restaurant_id)
            if merch:
                o_dict["merchant_name"] = getattr(merch, "restaurant_name", None) or merch.full_name
                o_dict["merchant_address"] = getattr(merch, "address", None) or merch.phone
                o_dict["merchant_lat"] = getattr(merch, "latitude", None)
                o_dict["merchant_lng"] = getattr(merch, "longitude", None)
                zones = getattr(merch, "delivery_zones", [])
                o_dict["zone"] = zones[0] if zones and len(zones) > 0 else "Algiers Centre"
                
        if getattr(order, "driver_id", None):
            driver = user_repo.get(order.driver_id)
            if driver:
                o_dict["driver_name"] = driver.full_name
                
        return jsonify(o_dict), 200

@admin_orders_bp.route("/orders/<order_id>/cancel", methods=["POST"])
def cancel_order(order_id):
    data = request.get_json(silent=True) or {}
    reason = data.get("reason", "Admin cancelled")
    try:
        with transaction() as session:
            repo = OrderRepository(session)
            order = repo.get_or_404(order_id)
            actor_id = getattr(request, "user_id", None)
            actor_role = getattr(request, "user_role", "admin")
            repo.transition(order, "cancelled", actor_role=actor_role, actor_id=actor_id, force=True)
            order.cancellation_reason = reason
            
            # Log action
            log_admin_action(
                session, actor_id=actor_id, actor_role=actor_role,
                action="cancel_order", target_type="order", target_id=order_id,
                metadata={"reason": reason}
            )
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    
    return jsonify({"message": "Order cancelled", "order_id": order_id}), 200

@admin_orders_bp.route("/orders/<order_id>/reassign", methods=["POST"])
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
            
            actor_id = getattr(request, "user_id", None)
            actor_role = getattr(request, "user_role", "admin")
            # Log action
            log_admin_action(
                session, actor_id=actor_id, actor_role=actor_role,
                action="reassign_driver", target_type="order", target_id=order_id,
                metadata={"old_driver_id": old_driver_id, "new_driver_id": new_driver_id}
            )
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    
    return jsonify({"message": "Driver reassigned", "order_id": order_id}), 200

@admin_orders_bp.route("/orders/<order_id>/force-complete", methods=["POST"])
def force_complete_order(order_id):
    try:
        with transaction() as session:
            repo = OrderRepository(session)
            order = repo.get_or_404(order_id)
            actor_id = getattr(request, "user_id", None)
            actor_role = getattr(request, "user_role", "admin")
            repo.transition(order, "delivered", actor_role=actor_role, actor_id=actor_id, force=True)
            
            # Log action
            log_admin_action(
                session, actor_id=actor_id, actor_role=actor_role,
                action="force_complete_order", target_type="order", target_id=order_id
            )
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    
    return jsonify({"message": "Order forcefully completed", "order_id": order_id}), 200
