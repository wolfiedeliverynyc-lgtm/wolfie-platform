"""
Enterprise Legal API Routes
Endpoints to fetch active policies, and submit policy acceptances.
"""
from flask import Blueprint, request, jsonify
from database import get_db_session, transaction
from services.compliance_manager import ComplianceManager
from routes.auth import require_auth
import hashlib

legal_bp = Blueprint("legal", __name__)

@legal_bp.route("/pending", methods=["GET"])
@require_auth()
def get_pending_policies():
    """Returns the list of policies the user still needs to accept."""
    with get_db_session() as session:
        comp_mgr = ComplianceManager(session)
        pending = comp_mgr.get_pending_policies(request.user_id, request.user_role)
        return jsonify({"pending_policies": pending}), 200

@legal_bp.route("/accept", methods=["POST"])
@require_auth()
def accept_policy():
    """Accept a specific legal policy."""
    data = request.get_json(silent=True) or {}
    policy_key = data.get("policy_key")
    method = data.get("acceptance_method", "clickwrap")
    geo = data.get("geo_metadata")

    if not policy_key:
        return jsonify({"error": "policy_key required"}), 400

    ip_address = request.remote_addr
    user_agent = request.user_agent.string

    with transaction() as session:
        comp_mgr = ComplianceManager(session)
        try:
            acc = comp_mgr.record_acceptance(
                user_id=request.user_id,
                role=request.user_role,
                policy_key=policy_key,
                ip_address=ip_address,
                user_agent=user_agent,
                method=method,
                geo=geo
            )
            return jsonify({"message": "Policy accepted", "policy_key": policy_key, "version": acc.policy_version}), 200
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            return jsonify({"error": "Failed to accept policy"}), 500

@legal_bp.route("/status", methods=["GET"])
@require_auth()
def get_compliance_status():
    """Check if the user is fully compliant."""
    with get_db_session() as session:
        comp_mgr = ComplianceManager(session)
        state = comp_mgr.evaluate_user_compliance(request.user_id, request.user_role)
        return jsonify({"compliance_status": state}), 200

