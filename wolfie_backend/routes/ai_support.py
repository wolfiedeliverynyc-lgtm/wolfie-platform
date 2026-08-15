import hashlib
import datetime
from flask import Blueprint, request, jsonify, current_app
from routes.auth import require_auth
from database import transaction, get_db_session
from database.schemas import AIConversation, AIMessage, User, SupportTicket
from services.ai_support_service import AISupportService
from services.redis_service import rate_limit
from services.ai_encryption import AIEncryption
from sqlalchemy import desc

ai_support_bp = Blueprint("ai_support", __name__)

def support_rate_key():
    """Generates a composite key based on JWT user, client IP, and User-Agent hash."""
    user_id = getattr(request, "user_id", "anonymous")
    ip = request.remote_addr
    device = request.headers.get("User-Agent", "unknown")
    device_hash = hashlib.md5(device.encode('utf-8')).hexdigest()[:8]
    return f"ai_chat:{user_id}:{ip}:{device_hash}"


# ── Client Routes ─────────────────────────────────────────────

@ai_support_bp.route("/chat", methods=["POST"])
@require_auth()
@rate_limit(limit=30, window=60, key_func=support_rate_key)
def chat_with_agent():
    """Post a new message from a client to the AI support agent."""
    data = request.get_json(silent=True) or {}
    message = data.get("message", "").strip()
    session_id = data.get("session_id", "").strip()
    
    if not message or not session_id:
        return jsonify({"error": "message and session_id are required"}), 400
        
    if len(message) > 1000:
        return jsonify({"error": "Message exceeds maximum allowed length of 1000 characters."}), 400
        
    if len(session_id) > 64:
        return jsonify({"error": "session_id exceeds maximum length of 64 characters."}), 400
        
    user_id = request.user_id
    user_role = request.user_role
    
    # Process message through AISupportService pipeline
    result = AISupportService.process_message(user_id, user_role, session_id, message)
    
    return jsonify({
        "response": result.get("response"),
        "escalated": result.get("escalate", False),
        "order_id": result.get("order_id"),
        "tracking_url": result.get("tracking_url"),
        "order_status": result.get("order_status")
    }), 200


@ai_support_bp.route("/history", methods=["GET"])
@require_auth()
def get_conversation_history():
    """Retrieve decrypted conversation history logs for a session."""
    session_id = request.args.get("session_id")
    if not session_id:
        return jsonify({"error": "session_id parameter is required"}), 400
        
    session = get_db_session()
    conv = session.query(AIConversation).filter(AIConversation.session_id == session_id).first()
    if not conv:
        return jsonify({"messages": []}), 200
        
    # Security check: verify this conversation belongs to the user
    if conv.user_id != request.user_id and request.user_role != "admin":
        return jsonify({"error": "Unauthorized to view this conversation"}), 403
        
    messages = session.query(AIMessage).filter(AIMessage.conversation_id == conv.id).order_by(AIMessage.created_at.asc()).all()
    
    history = []
    for m in messages:
        decrypted_msg = AIEncryption.decrypt(m.message_encrypted)
        history.append({
            "id": m.id,
            "role": m.role,
            "message": decrypted_msg,
            "intent": m.intent,
            "created_at": m.created_at.isoformat()
        })
        
    return jsonify({
        "session_id": session_id,
        "is_escalated": conv.is_escalated,
        "summary": conv.summary,
        "messages": history
    }), 200


@ai_support_bp.route("/feedback", methods=["POST"])
@require_auth()
def update_agent_feedback():
    """Allows rating the AI conversation response (1 = upvote/positive, -1 = downvote/negative)."""
    data = request.get_json(silent=True) or {}
    session_id = data.get("session_id")
    rating = data.get("rating") # 1 or -1
    
    if not session_id or rating not in [1, -1]:
        return jsonify({"error": "session_id and rating (1 or -1) are required"}), 400
        
    session = get_db_session()
    conv = session.query(AIConversation).filter(AIConversation.session_id == session_id).first()
    if not conv:
        return jsonify({"error": "Conversation session not found"}), 404
        
    if conv.user_id != request.user_id and request.user_role != "admin":
        return jsonify({"error": "Unauthorized to rate this conversation"}), 403
        
    with transaction() as tx_session:
        # Load object in writing session
        tx_conv = tx_session.query(AIConversation).filter(AIConversation.id == conv.id).first()
        tx_conv.rating = rating
        return jsonify({"success": True, "message": "Feedback recorded successfully"}), 200


# ── Admin Audit Dashboard Routes ──────────────────────────────

@ai_support_bp.route("/admin/conversations", methods=["GET"])
@require_auth(["admin"])
def admin_list_conversations():
    """List AI conversations for administrative review/audit."""
    session = get_db_session()
    
    role_filter = request.args.get("role")
    escalated_filter = request.args.get("escalated") # 'true' / 'false'
    rating_filter = request.args.get("rating") # '1' / '-1'
    
    query = session.query(AIConversation)
    
    if role_filter:
        query = query.filter(AIConversation.user_role == role_filter)
    if escalated_filter == "true":
        query = query.filter(AIConversation.is_escalated == True)
    elif escalated_filter == "false":
        query = query.filter(AIConversation.is_escalated == False)
    if rating_filter:
        query = query.filter(AIConversation.rating == int(rating_filter))
        
    conversations = query.order_by(desc(AIConversation.created_at)).all()
    
    results = []
    for c in conversations:
        results.append({
            "id": c.id,
            "user_id": c.user_id,
            "user_email": c.user.email if c.user else "Deleted User",
            "user_role": c.user_role,
            "session_id": c.session_id,
            "summary": c.summary,
            "is_escalated": c.is_escalated,
            "rating": c.rating,
            "created_at": c.created_at.isoformat()
        })
        
    return jsonify(results), 200


@ai_support_bp.route("/admin/conversations/<conv_id>", methods=["GET"])
@require_auth(["admin"])
def admin_view_conversation(conv_id):
    """View full detailed logs & decrypted messages for an audit session."""
    session = get_db_session()
    conv = session.query(AIConversation).filter(AIConversation.id == conv_id).first()
    if not conv:
        return jsonify({"error": "Conversation not found"}), 404
        
    messages = session.query(AIMessage).filter(AIMessage.conversation_id == conv_id).order_by(AIMessage.created_at.asc()).all()
    
    history = []
    for m in messages:
        decrypted_msg = AIEncryption.decrypt(m.message_encrypted)
        history.append({
            "id": m.id,
            "role": m.role,
            "message": decrypted_msg,
            "intent": m.intent,
            "model_used": m.model_used,
            "tokens_used": m.tokens_used,
            "latency_ms": m.latency_ms,
            "confidence_score": m.confidence_score,
            "created_at": m.created_at.isoformat()
        })
        
    return jsonify({
        "id": conv.id,
        "user_id": conv.user_id,
        "user_email": conv.user.email if conv.user else "Deleted User",
        "user_role": conv.user_role,
        "session_id": conv.session_id,
        "summary": conv.summary,
        "is_escalated": conv.is_escalated,
        "rating": conv.rating,
        "created_at": conv.created_at.isoformat(),
        "messages": history
    }), 200


# ── Data Retention Tasks ──────────────────────────────────────

@ai_support_bp.route("/admin/retention-cleanup", methods=["POST"])
@require_auth(["admin"])
def run_retention_cleanup():
    """Anonymize or hard-delete conversations older than 180 days."""
    session = get_db_session()
    cutoff_date = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=180)
    
    try:
        with transaction() as tx_session:
            # Fetch conversations to delete
            old_convs = tx_session.query(AIConversation).filter(AIConversation.created_at < cutoff_date).all()
            deleted_count = len(old_convs)
            
            for c in old_convs:
                # AIMessage table is set to cascade delete on foreign key
                tx_session.delete(c)
                
            return jsonify({
                "success": True,
                "deleted_conversations_count": deleted_count,
                "message": f"Successfully deleted {deleted_count} conversations older than 180 days."
            }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
