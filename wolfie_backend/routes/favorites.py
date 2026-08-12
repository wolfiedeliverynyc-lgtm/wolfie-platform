from flask import Blueprint, request, jsonify
from routes.auth import require_auth
from database import transaction, get_db_session
from database.schemas import Favorite, User

favorites_bp = Blueprint("favorites", __name__)

import math

@favorites_bp.route("", methods=["GET"])
@require_auth()
def list_favorites():
    page     = int(request.args.get("page", 1))
    per_page = min(int(request.args.get("per_page", 20)), 100)
    offset   = (page - 1) * per_page

    with get_db_session() as session:
        from sqlalchemy import func
        # Single JOIN — no N+1
        rows = (
            session.query(
                Favorite.id,
                Favorite.restaurant_id,
                Favorite.created_at,
                User.restaurant_name,
                User.email,
                User.rating,
                User.logo_image,
            )
            .join(User, User.id == Favorite.restaurant_id)
            .filter(Favorite.user_id == request.user_id)
            .order_by(Favorite.created_at.desc())
            .limit(per_page)
            .offset(offset)
            .all()
        )
        total = session.query(func.count(Favorite.id)).filter(Favorite.user_id == request.user_id).scalar()

    result = [{
        "id":              r.id,
        "restaurant_id":  r.restaurant_id,
        "restaurant_name": r.restaurant_name,
        "email":          r.email,
        "rating":         r.rating,
        "logo_image":     r.logo_image,
        "created_at":     r.created_at.isoformat(),
    } for r in rows]

    return jsonify({
        "favorites": result,
        "pagination": {
            "page": page, "per_page": per_page,
            "total": total, "pages": math.ceil(total / per_page) if total else 0,
        }
    }), 200

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
