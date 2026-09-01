"""
AI Menu OCR Extraction API
Proxies image/PDF uploads to Gemini Vision for menu item extraction.
Keeps the Gemini API key secure on the server side.
"""
import os
import base64
import json
import logging
from flask import Blueprint, request, jsonify
from routes.auth import require_auth

ai_menu_ocr_bp = Blueprint('ai_menu_ocr', __name__)
logger = logging.getLogger('wolfie')


@ai_menu_ocr_bp.route('/api/ai/menu-ocr', methods=['POST'])
@require_auth()
def extract_menu_from_image():
    """
    Accepts an image or PDF file upload and uses Gemini Vision to extract
    menu items. Returns a JSON array of extracted menu items.
    """
    import google.generativeai as genai

    gemini_api_key = os.getenv('GEMINI_API_KEY')
    if not gemini_api_key:
        logger.error('GEMINI_API_KEY not configured in environment')
        return jsonify({'error': 'AI menu scanning is not configured on the server.'}), 503

    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded.'}), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({'error': 'Empty file uploaded.'}), 400

    # Validate file type
    allowed_mimes = {
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'image/heic', 'image/heif', 'application/pdf'
    }
    mime_type = file.content_type or 'image/jpeg'
    if mime_type not in allowed_mimes:
        return jsonify({'error': f'Unsupported file type: {mime_type}. Upload an image or PDF.'}), 415

    try:
        file_bytes = file.read()
        if len(file_bytes) > 20 * 1024 * 1024:  # 20 MB max
            return jsonify({'error': 'File too large. Maximum size is 20 MB.'}), 413

        # Configure Gemini — use gemini-1.5-flash (widely available)
        genai.configure(api_key=gemini_api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')

        prompt = (
            "You are a menu extraction AI. Analyze this menu image or document carefully.\n"
            "Extract ALL menu items you can see and return them as a JSON array.\n"
            "Each object MUST have these exact fields:\n"
            "- name: string (item name)\n"
            "- category: string (e.g. Burgers, Pizza, Sides, Drinks, Desserts, Appetizers, Salads, Pasta)\n"
            "- price: number (numeric price value, 0 if not visible)\n"
            "- ingredients: string (comma-separated ingredients list, empty string if not visible)\n"
            "- confidence: number (your confidence 1-100 that the item was read correctly)\n\n"
            "Return ONLY a raw JSON array. No markdown, no code fences, no explanation."
        )

        image_part = {
            'inline_data': {
                'mime_type': mime_type,
                'data': base64.b64encode(file_bytes).decode('utf-8')
            }
        }

        response = model.generate_content([prompt, image_part])

        raw_text = response.text.strip()
        # Strip any accidental markdown formatting
        if raw_text.startswith('```'):
            raw_text = raw_text.split('```')[1]
            if raw_text.startswith('json'):
                raw_text = raw_text[4:]
        raw_text = raw_text.strip()

        items = json.loads(raw_text)

        if not isinstance(items, list):
            return jsonify({'error': 'AI returned unexpected format. Try a clearer image.'}), 422

        sanitized = []
        for i, item in enumerate(items):
            sanitized.append({
                'id': f'ai_{i}',
                'name': str(item.get('name', '')).strip(),
                'category': str(item.get('category', 'Other')).strip(),
                'price': float(item.get('price', 0)),
                'ingredients': str(item.get('ingredients', '')).strip(),
                'confidence': int(item.get('confidence', 80)),
                'warning': 'Low confidence — please verify' if int(item.get('confidence', 80)) < 75 else None,
                'image': None
            })

        logger.info(f'AI menu OCR extracted {len(sanitized)} items for user {request.user_id}')
        return jsonify({'items': sanitized, 'count': len(sanitized)})

    except json.JSONDecodeError as e:
        logger.error(f'Gemini returned non-JSON for menu OCR: {e}')
        return jsonify({'error': 'AI could not parse your menu. Try a higher quality image.'}), 422
    except Exception as e:
        logger.error(f'AI menu OCR error: {e}')
        return jsonify({'error': str(e)}), 500
