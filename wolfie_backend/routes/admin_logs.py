"""
Admin Logs Center
"""
import logging
from flask import Blueprint, request, jsonify
from routes.auth import require_auth
from database import get_db_session
from database.repositories import SupportLogRepository

admin_logs_bp = Blueprint("admin_logs", __name__)
logger = logging.getLogger("wolfie")

@admin_logs_bp.route("/logs", methods=["GET"])
@require_auth(["admin"], admin_types=["super_admin"])
def list_logs():
    limit  = int(request.args.get("limit", 100))
    offset = int(request.args.get("offset", 0))
    with get_db_session() as session:
        repo = SupportLogRepository(session)
        logs = repo.list(limit=limit, offset=offset)
        return jsonify({
            "logs": [repo.safe_dict(l) for l in logs],
            "count": len(logs)
        }), 200
