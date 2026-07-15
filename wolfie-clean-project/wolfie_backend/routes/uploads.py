from flask import Blueprint, request, jsonify
from services.storage import storage_provider
from functools import wraps

uploads_bp = Blueprint('uploads', __name__)

from routes.auth import require_auth

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@uploads_bp.route('/uploads', methods=['POST'])
@require_auth(roles=["driver"])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part in request"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if not allowed_file(file.filename):
        return jsonify({"error": "File type not allowed"}), 400
        
    # Check file size (e.g. max 5MB)
    file.seek(0, 2)
    file_length = file.tell()
    if file_length > 5 * 1024 * 1024:
        return jsonify({"error": "File exceeds 5MB limit"}), 400
    file.seek(0)
    
    try:
        url = storage_provider.upload(file)
        return jsonify({"url": url}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
