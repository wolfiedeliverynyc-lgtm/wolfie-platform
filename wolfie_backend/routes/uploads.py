from flask import Blueprint, request, jsonify
from services.storage import storage_provider
from routes.auth import require_auth
from services.error_handler import make_error_response

uploads_bp = Blueprint('uploads', __name__)


@uploads_bp.route('/uploads', methods=['POST'])
@require_auth(roles=["driver", "customer", "restaurant", "admin"])
def upload_file():
    if 'file' not in request.files:
        return make_error_response("No file part in request", "UPLOAD_001", 400)
        
    file = request.files['file']
    if file.filename == '':
        return make_error_response("No selected file", "UPLOAD_002", 400)

    context = request.form.get("context") or request.args.get("context") or "default"
    
    try:
        url = storage_provider.upload(file, context=context)
        return jsonify({
            "url": url,
            "context": context
        }), 201
    except ValueError as ve:
        return make_error_response(str(ve), "UPLOAD_VALIDATION_ERROR", 400)
    except Exception as e:
        return make_error_response(str(e), "UPLOAD_ERROR", 500)


@uploads_bp.route('/uploads/<filename>', methods=['GET'])
def get_uploaded_file(filename):
    from flask import send_from_directory
    from services.storage import UPLOAD_DIR
    return send_from_directory(UPLOAD_DIR, filename)
