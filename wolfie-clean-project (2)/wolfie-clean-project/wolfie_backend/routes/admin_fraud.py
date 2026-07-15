"""
Admin Fraud & Trust Center
"""
import logging
from flask import Blueprint, request, jsonify
from routes.auth import require_auth
from database import transaction, get_db_session
from database.repositories import FraudFlagRepository
from services.audit_logger import log_admin_action

admin_fraud_bp = Blueprint("admin_fraud", __name__)
logger = logging.getLogger("wolfie")

@admin_fraud_bp.route("/fraud/flags", methods=["GET"])
@require_auth(["admin"], admin_types=["super_admin", "fraud_analyst"])
def list_fraud_flags():
    limit  = int(request.args.get("limit", 50))
    offset = int(request.args.get("offset", 0))
    with get_db_session() as session:
        repo = FraudFlagRepository(session)
        flags = repo.find_open(limit=limit, offset=offset)
        return jsonify({
            "flags": [repo.safe_dict(f) for f in flags],
            "count": len(flags)
        }), 200

@admin_fraud_bp.route("/fraud/flags/<flag_id>/resolve", methods=["POST"])
@require_auth(["admin"], admin_types=["super_admin", "fraud_analyst"])
def resolve_fraud_flag(flag_id):
    data = request.get_json(silent=True) or {}
    resolution_notes = data.get("notes", "")
    try:
        with transaction() as session:
            repo = FraudFlagRepository(session)
            flag = repo.get_or_404(flag_id)
            flag.status = "resolved"
            if resolution_notes:
                flag.notes = (flag.notes or "") + f"\nResolution: {resolution_notes}"
            
            log_admin_action(
                session, actor_id=request.user_id, actor_role=request.user_role,
                action="resolve_fraud_flag", target_type="fraud_flag", target_id=flag_id,
                metadata={"notes": resolution_notes}
            )
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    return jsonify({"message": "Fraud flag resolved", "flag_id": flag_id}), 200
