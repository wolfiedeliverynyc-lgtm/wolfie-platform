"""
Admin Configuration & Feature Flags
"""
import logging
from flask import Blueprint, request, jsonify
from routes.auth import require_auth
from database import transaction, get_db_session
from database.schemas import AppConfig
from services.audit_logger import log_admin_action

admin_config_bp = Blueprint("admin_config", __name__)
logger = logging.getLogger("wolfie")

@admin_config_bp.route("/config", methods=["GET"])
@require_auth(["admin"], admin_types=["super_admin", "operations_admin", "read_only_analyst"])
def get_configs():
    with get_db_session() as session:
        configs = session.query(AppConfig).all()
        return jsonify({c.key: c.value for c in configs}), 200

@admin_config_bp.route("/config", methods=["PATCH"])
@require_auth(["admin"], admin_types=["super_admin"])
def update_config():
    data = request.get_json(silent=True) or {}
    key = data.get("key")
    value = data.get("value")
    if not key or value is None:
        return jsonify({"error": "key and value required"}), 400
    
    try:
        with transaction() as session:
            config = session.query(AppConfig).filter_by(key=key).first()
            if config:
                config.value = str(value)
            else:
                config = AppConfig(key=key, value=str(value))
                session.add(config)
            
            log_admin_action(
                session, actor_id=request.user_id, actor_role=request.user_role,
                action="update_feature_flag", target_type="config", target_id=key,
                metadata={"new_value": value}
            )
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    return jsonify({"message": "Config updated", "key": key, "value": value}), 200
