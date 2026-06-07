"""
Admin Refunds Center
"""
import logging
from flask import Blueprint, request, jsonify
from routes.auth import require_auth
from database import transaction, get_db_session
from database.repositories import RefundRequestRepository
from services.audit_logger import log_admin_action

admin_refunds_bp = Blueprint("admin_refunds", __name__)
logger = logging.getLogger("wolfie")

@admin_refunds_bp.route("/refunds", methods=["GET"])
@require_auth(["admin"], admin_types=["super_admin", "operations_admin", "support_agent", "finance_admin"])
def list_refunds():
    limit  = int(request.args.get("limit", 50))
    offset = int(request.args.get("offset", 0))
    with get_db_session() as session:
        repo = RefundRequestRepository(session)
        refunds = repo.find_pending(limit=limit, offset=offset)
        return jsonify({
            "refunds": [repo.safe_dict(r) for r in refunds],
            "count": len(refunds)
        }), 200

@admin_refunds_bp.route("/refunds/<refund_id>/approve", methods=["POST"])
@require_auth(["admin"], admin_types=["super_admin", "finance_admin", "support_agent"])
def approve_refund(refund_id):
    try:
        with transaction() as session:
            repo = RefundRequestRepository(session)
            refund = repo.get_or_404(refund_id)
            refund.status = "approved"
            refund.reviewed_by = request.user_id
            
            # Real payment gateway integration would happen here
            
            log_admin_action(
                session, actor_id=request.user_id, actor_role=request.user_role,
                action="approve_refund", target_type="refund", target_id=refund_id,
                metadata={"amount": refund.amount_requested}
            )
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    return jsonify({"message": "Refund approved", "refund_id": refund_id}), 200

@admin_refunds_bp.route("/refunds/<refund_id>/deny", methods=["POST"])
@require_auth(["admin"], admin_types=["super_admin", "finance_admin", "support_agent", "fraud_analyst"])
def deny_refund(refund_id):
    data = request.get_json(silent=True) or {}
    reason = data.get("reason", "")
    try:
        with transaction() as session:
            repo = RefundRequestRepository(session)
            refund = repo.get_or_404(refund_id)
            refund.status = "denied"
            refund.reviewed_by = request.user_id
            
            log_admin_action(
                session, actor_id=request.user_id, actor_role=request.user_role,
                action="deny_refund", target_type="refund", target_id=refund_id,
                metadata={"reason": reason}
            )
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    return jsonify({"message": "Refund denied", "refund_id": refund_id}), 200

@admin_refunds_bp.route("/refunds/<refund_id>/partial", methods=["POST"])
@require_auth(["admin"], admin_types=["super_admin", "finance_admin"])
def partial_refund(refund_id):
    data = request.get_json(silent=True) or {}
    amount = float(data.get("amount", 0))
    if amount <= 0:
        return jsonify({"error": "amount required"}), 400

    try:
        with transaction() as session:
            repo = RefundRequestRepository(session)
            refund = repo.get_or_404(refund_id)
            refund.status = "approved_partial"
            refund.amount_requested = amount # Or store as actual_refunded_amount
            refund.reviewed_by = request.user_id
            
            log_admin_action(
                session, actor_id=request.user_id, actor_role=request.user_role,
                action="partial_refund", target_type="refund", target_id=refund_id,
                metadata={"amount": amount}
            )
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    return jsonify({"message": "Partial refund approved", "refund_id": refund_id, "amount": amount}), 200
