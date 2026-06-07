from flask import Blueprint, request, jsonify
from routes.auth import require_auth
from database import transaction, get_db_session
from database.schemas import Favorite, User

favorites_bp = Blueprint("favorites", __name__)

@favorites_bp.route("", methods=["GET"])
@require_auth()
def list_favorites():
    session = get_db_session()
    favorites = session.query(Favorite).filter(Favorite.user_id == request.user_id).all()
    
    # Resolve restaurant details
    result = []
    for f in favorites:
        rest = session.query(User).filter(User.id == f.restaurant_id).first()
        if rest:
            result.append({
                "id": f.id,
                "restaurant_id": f.restaurant_id,
                "restaurant_name": rest.restaurant_name or rest.full_name,
                "email": rest.email,
                "rating": rest.rating,
                "created_at": f.created_at.isoformat()
            })
    return jsonify(result), 200

@favorites_bp.route("", methods=["POST"])
@require_auth()
def add_favorite():
    data = request.get_json(silent=True) or {}
    restaurant_id = data.get("restaurant_id")
    if not restaurant_id:
        return jsonify({"error": "restaurant_id is required"}), 400

    session = get_db_session()
    rest = session.query(User).filter(User.id == restaurant_id, User.role == "restaurant").first()
    if not rest:
        return jsonify({"error": "Restaurant not found"}), 404

    # Check if already favorited
    existing = session.query(Favorite).filter(Favorite.user_id == request.user_id, Favorite.restaurant_id == restaurant_id).first()
    if existing:
        return jsonify({"message": "Already favorited", "id": existing.id}), 200

    with transaction() as tx_session:
        new_fav = Favorite(
            user_id=request.user_id,
            restaurant_id=restaurant_id
        )
        tx_session.add(new_fav)
        tx_session.flush()

        return jsonify({
            "id": new_fav.id,
            "user_id": new_fav.user_id,
            "restaurant_id": new_fav.restaurant_id,
            "created_at": new_fav.created_at.isoformat()
        }), 201

@favorites_bp.route("/<restaurant_id>", methods=["DELETE"])
@require_auth()
def remove_favorite(restaurant_id):
    with transaction() as session:
        # Allow deletion by favorite ID or restaurant ID
        fav = session.query(Favorite).filter(
            Favorite.user_id == request.user_id,
            (Favorite.id == restaurant_id) | (Favorite.restaurant_id == restaurant_id)
        ).first()

        if not fav:
            return jsonify({"error": "Favorite not found"}), 404

        session.delete(fav)
        return jsonify({"message": "Favorite removed"}), 200
