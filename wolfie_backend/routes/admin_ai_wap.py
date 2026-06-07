"""
Admin AI & WAP Analytics Center
"""
import logging
from flask import Blueprint, request, jsonify
from routes.auth import require_auth
from database import get_db_session
from database.repositories import WAPModelMetricsRepository

admin_ai_wap_bp = Blueprint("admin_ai_wap", __name__)
logger = logging.getLogger("wolfie")

@admin_ai_wap_bp.route("/ai/metrics", methods=["GET"])
@require_auth(["admin"], admin_types=["super_admin", "operations_admin", "read_only_analyst"])
def get_model_metrics():
    limit  = int(request.args.get("limit", 50))
    offset = int(request.args.get("offset", 0))
    with get_db_session() as session:
        repo = WAPModelMetricsRepository(session)
        metrics = repo.list(limit=limit, offset=offset)
        return jsonify({
            "metrics": [repo.safe_dict(m) for m in metrics],
            "count": len(metrics)
        }), 200

@admin_ai_wap_bp.route("/ai/retrain", methods=["POST"])
@require_auth(["admin"], admin_types=["super_admin"])
def trigger_retrain():
    # Placeholder: Dispatch celery task
    from tasks.admin_tasks import wap_retrain_models
    wap_retrain_models.delay()
    
    return jsonify({"message": "Retraining job queued successfully"}), 202

@admin_ai_wap_bp.route("/ai/fallback", methods=["POST"])
@require_auth(["admin"], admin_types=["super_admin", "operations_admin"])
def toggle_fallback():
    data = request.get_json(silent=True) or {}
    enable = data.get("enable", True)
    # Logic to update feature flag WAP_ENABLED goes here
    return jsonify({"message": f"WAP Fallback mode {'enabled' if enable else 'disabled'}"}), 200
