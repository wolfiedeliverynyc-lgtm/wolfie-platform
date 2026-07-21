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
    limit  = int(request.args.get("limit", 50))
    offset = int(request.args.get("offset", 0))

    with get_db_session() as session:
        from database.schemas import DriverPayout
        from models.payout import RestaurantPayout
        from sqlalchemy import select

        # Query driver payouts
        driver_stmt = select(DriverPayout).order_by(DriverPayout.created_at.desc()).limit(limit).offset(offset)
        driver_payouts = session.scalars(driver_stmt).all()

        # Query restaurant payouts
        rest_stmt = select(RestaurantPayout).order_by(RestaurantPayout.created_at.desc()).limit(limit).offset(offset)
        rest_payouts = session.scalars(rest_stmt).all()

        # Helper to convert object to dict
        def payout_to_dict(p, fields):
            res = {}
            for f in fields:
                res[f] = getattr(p, f, None)
            if hasattr(p, 'created_at') and p.created_at:
                res['created_at'] = p.created_at.isoformat()
            if hasattr(p, 'updated_at') and p.updated_at:
                res['updated_at'] = p.updated_at.isoformat()
            return res

        return jsonify({
            "driver_payouts": [
                payout_to_dict(dp, ["id", "driver_id", "order_id", "amount", "status", "week_start"])
                for dp in driver_payouts
            ],
            "restaurant_payouts": [
                payout_to_dict(rp, ["id", "restaurant_id", "amount", "payout_status", "transfer_reference", "initiated_by", "payout_method"])
                for rp in rest_payouts
            ]
        }), 200
