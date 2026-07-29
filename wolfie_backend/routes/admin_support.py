"""
Admin Support Center + AI Agent
"""
import os
import logging
import json
from flask import Blueprint, request, jsonify, current_app
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


# ── AI Support Agent (Gemini) ──────────────────

@admin_support_bp.route("/support/ai", methods=["POST"])
@require_auth()
def ai_support_chat():
    """
    AI Support Agent endpoint using Google Gemini API
    
    Request:
        {
            "message": "Help! My order is late",
            "order_id": "order_123" (optional),
            "context": {...} (optional)
        }
    
    Response:
        {
            "reply": "AI-generated response",
            "confidence": 0.95,
            "escalate": False
        }
    """
    data = request.get_json(silent=True) or {}
    user_message = data.get("message", "").strip()
    
    if not user_message:
        return jsonify({"error": "message is required"}), 400
    
    # Get Gemini API key from environment
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        logger.error("❌ GEMINI_API_KEY not set in environment")
        return jsonify({
            "error": "AI support unavailable",
            "message": "API key not configured",
            "escalate": True
        }), 503
    
    try:
        import google.generativeai as genai
        
        # Configure Gemini
        genai.configure(api_key=gemini_api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        # Build context
        order_id = data.get("order_id")
        context_prompt = f"""You are a helpful Wolfie Delivery customer support agent.
Keep responses short, friendly, and actionable.
User role: {request.user_role}
Order ID: {order_id or 'N/A'}

User message: {user_message}

Respond in the same language as the user message."""
        
        # Call Gemini
        logger.info(f"🤖 Calling Gemini AI for support — user: {request.user_id}")
        response = model.generate_content(context_prompt)
        
        if not response.text:
            logger.warning("⚠️  Gemini returned empty response")
            return jsonify({
                "error": "No response from AI",
                "escalate": True
            }), 500
        
        # Determine if escalation needed (simple heuristic)
        escalate = any(keyword in user_message.lower() 
                      for keyword in ["urgent", "asap", "problem", "broken", "bug", "crash"])
        
        logger.info(f"✅ Gemini responded — escalate={escalate}")
        
        return jsonify({
            "reply": response.text,
            "confidence": 0.95,  # Gemini confidence
            "escalate": escalate,
            "order_id": order_id
        }), 200
        
    except ImportError:
        logger.error("❌ google-generativeai not installed")
        return jsonify({
            "error": "AI library not installed",
            "escalate": True
        }), 500
    except Exception as e:
        logger.error(f"❌ Gemini API error: {e}")
        return jsonify({
            "error": f"AI error: {str(e)}",
            "escalate": True
        }), 500
