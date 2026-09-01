from flask import Blueprint, request, jsonify
from routes.auth import require_auth
from database import transaction, get_db_session
from database.schemas import User
from datetime import datetime, timezone

driver_kyc_bp = Blueprint("driver_kyc", __name__)

@driver_kyc_bp.route("/documents", methods=["GET"])
@require_auth(roles=["driver", "admin"])
def get_kyc_status():
    session = get_db_session()
    user = session.query(User).filter(User.id == request.user_id).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "kyc_status": user.kyc_status,
        "documents": user.kyc_documents or {}
    }), 200

@driver_kyc_bp.route("/documents", methods=["POST"])
@require_auth(roles=["driver"])
def upload_kyc_document():
    # Support both JSON-only (file_name) and multipart file upload
    doc_type = request.form.get("document_type") or (request.get_json(silent=True) or {}).get("document_type")
    file = request.files.get("file")

    if not doc_type:
        return jsonify({"error": "document_type is required"}), 400

    if doc_type not in ["selfie", "license", "id_card", "registration", "insurance", "vehicle_photo"]:
        return jsonify({"error": "Invalid document type"}), 400

    file_url = ""
    file_name = ""

    if file:
        # Actual file upload via storage provider
        try:
            from services.storage import storage_provider
            file_url = storage_provider.upload(file, context='kyc')
            file_name = file.filename or f"{doc_type}_document"
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            return jsonify({"error": f"Upload failed: {str(e)}"}), 500
    else:
        # Fallback: accept JSON body with file_name only (legacy)
        data = request.get_json(silent=True) or {}
        file_name = data.get("file_name", f"{doc_type}_document")
        file_url = data.get("file_url", "")

    with transaction() as session:
        user = session.query(User).filter(User.id == request.user_id).first()
        if not user:
            return jsonify({"error": "User not found"}), 404

        docs = dict(user.kyc_documents or {})
        docs[doc_type] = {
            "file_name": file_name,
            "file_url": file_url,
            "status": "pending_review",
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }
        
        user.kyc_documents = docs
        
        # If all required documents are uploaded, auto transition status to 'pending'
        required = ["selfie", "license", "id_card", "registration"]
        if all(k in docs for k in required):
            user.kyc_status = "pending"

        return jsonify({
            "message": "Document uploaded successfully",
            "kyc_status": user.kyc_status,
            "documents": user.kyc_documents
        }), 200

@driver_kyc_bp.route("/kyc/review", methods=["POST"])
@require_auth(roles=["admin"])
def review_kyc():
    data = request.get_json(silent=True) or {}
    driver_id = data.get("driver_id")
    status = data.get("status") # approved, rejected
    rejection_reason = data.get("rejection_reason", "")

    if not driver_id or status not in ["approved", "rejected"]:
        return jsonify({"error": "driver_id and status (approved/rejected) are required"}), 400

    with transaction() as session:
        driver = session.query(User).filter(User.id == driver_id, User.role.in_(["driver", "restaurant"])).first()
        if not driver:
            return jsonify({"error": "User not found"}), 404

        driver.kyc_status = status
        
        docs = dict(driver.kyc_documents or {})
        for doc in docs.values():
            if isinstance(doc, dict):
                doc["status"] = "approved" if status == "approved" else "rejected"
                if status == "rejected" and rejection_reason:
                    doc["error_reason"] = rejection_reason

        driver.kyc_documents = docs

        return jsonify({
            "message": f"KYC status updated to {status}",
            "driver_id": driver_id,
            "kyc_status": driver.kyc_status
        }), 200

