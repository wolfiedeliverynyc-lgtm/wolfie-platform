"""
Admin Financial Dashboard
"""
import logging
from flask import Blueprint, request, jsonify
from routes.auth import require_auth
from database import get_db_session
from database.repositories import OrderRepository

admin_finance_bp = Blueprint("admin_finance", __name__)
logger = logging.getLogger("wolfie")

@admin_finance_bp.route("/finance/revenue", methods=["GET"])
@require_auth(["admin"], admin_types=["super_admin", "finance_admin", "read_only_analyst"])
def get_revenue():
    with get_db_session() as session:
        repo = OrderRepository(session)
        # This currently returns GMV, Net Revenue, etc.
        return jsonify(repo.revenue_summary()), 200

@admin_finance_bp.route("/finance/payouts", methods=["GET"])
@require_auth(["admin"], admin_types=["super_admin", "finance_admin"])
def list_payouts():
    # Placeholder for driver/restaurant payouts logic
    return jsonify({
        "driver_payouts": [],
        "restaurant_payouts": [],
        "message": "Payout analytics coming in next iteration"
    }), 200
