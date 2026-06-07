"""
Admin Support Center
"""
import logging
from flask import Blueprint, request, jsonify
from routes.auth import require_auth
from database import transaction, get_db_session
from database.repositories import SupportTicketRepository
from services.audit_logger import log_admin_action

admin_support_bp = Blueprint("admin_support", __name__)
logger = logging.getLogger("wolfie")

@admin_support_bp.route("/support/tickets", methods=["GET"])
@require_auth(["admin"], admin_types=["super_admin", "operations_admin", "support_agent"])
def list_tickets():
    status = request.args.get("status", "open")
    limit  = int(request.args.get("limit", 50))
    offset = int(request.args.get("offset", 0))
    with get_db_session() as session:
        repo = SupportTicketRepository(session)
        tickets = repo.find_by_status(status, limit=limit, offset=offset)
        return jsonify({
            "tickets": [repo.safe_dict(t) for t in tickets],
            "count": len(tickets)
        }), 200

@admin_support_bp.route("/support/tickets/<ticket_id>/resolve", methods=["POST"])
@require_auth(["admin"], admin_types=["super_admin", "operations_admin", "support_agent"])
def resolve_ticket(ticket_id):
    data = request.get_json(silent=True) or {}
    resolution = data.get("resolution", "")
    try:
        with transaction() as session:
            repo = SupportTicketRepository(session)
            ticket = repo.get_or_404(ticket_id)
            ticket.status = "resolved"
            ticket.resolution = resolution
            ticket.assigned_to = request.user_id
            
            log_admin_action(
                session, actor_id=request.user_id, actor_role=request.user_role,
                action="resolve_ticket", target_type="ticket", target_id=ticket_id,
                metadata={"resolution": resolution}
            )
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    return jsonify({"message": "Ticket resolved", "ticket_id": ticket_id}), 200

@admin_support_bp.route("/support/tickets/<ticket_id>/escalate", methods=["POST"])
@require_auth(["admin"], admin_types=["super_admin", "operations_admin", "support_agent"])
def escalate_ticket(ticket_id):
    data = request.get_json(silent=True) or {}
    reason = data.get("reason", "")
    try:
        with transaction() as session:
            repo = SupportTicketRepository(session)
            ticket = repo.get_or_404(ticket_id)
            ticket.status = "escalated"
            ticket.priority = "high"
            
            log_admin_action(
                session, actor_id=request.user_id, actor_role=request.user_role,
                action="escalate_ticket", target_type="ticket", target_id=ticket_id,
                metadata={"reason": reason}
            )
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    return jsonify({"message": "Ticket escalated", "ticket_id": ticket_id}), 200
