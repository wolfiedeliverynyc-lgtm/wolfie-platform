"""
╔══════════════════════════════════════════════════════════════╗
║   WOLFIE DELIVERY — routes/ratings.py  (v3 — Repositories)  ║
╚══════════════════════════════════════════════════════════════╝
"""

import logging
from flask import Blueprint, request, jsonify
from routes.auth import require_auth
from database import transaction, get_db_session
from database.repositories import OrderRepository
from database.repositories.rating import RatingRepository

ratings_bp = Blueprint("ratings", __name__)
logger     = logging.getLogger("wolfie")


@ratings_bp.route("/submit", methods=["POST"])
@require_auth(["customer"])
def submit_rating():
    data     = request.get_json(silent=True) or {}
    order_id = data.get("order_id")
    if not order_id:
        return jsonify({"error": "order_id required"}), 400

    try:
        with transaction() as session:
            order_repo = OrderRepository(session)
            order      = order_repo.get(order_id)
            if not order:
                return jsonify({"error": "Order not found"}), 404
            if order.customer_id != request.user_id:
                return jsonify({"error": "Not your order"}), 403
            if order.status != "delivered":
                return jsonify({"error": "Can only rate delivered orders"}), 400

            repo    = RatingRepository(session)
            reviews = repo.create(
                order_id          = order_id,
                customer_id       = request.user_id,
                driver_id         = order.driver_id,
                restaurant_id     = order.restaurant_id,
                driver_rating     = data.get("driver_rating"),
                restaurant_rating = data.get("restaurant_rating"),
                comment           = data.get("comment"),
            )

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"submit_rating: {e}")
        return jsonify({"error": "Rating submission failed"}), 500

    return jsonify({
        "message":   "Rating submitted — thank you!",
        "review_ids": [r.id for r in reviews],
    }), 201


@ratings_bp.route("/driver/<driver_id>", methods=["GET"])
def get_driver_ratings(driver_id: str):
    limit = int(request.args.get("limit", 20))
    with get_db_session() as session:
        repo    = RatingRepository(session)
        summary = repo.summary(driver_id, "driver")
        reviews = repo.find_for_driver(driver_id, limit=limit)
        return jsonify({
            **summary,
            "reviews": [repo.to_dict(r) for r in reviews],
        }), 200


@ratings_bp.route("/restaurant/<restaurant_id>", methods=["GET"])
def get_restaurant_ratings(restaurant_id: str):
    limit = int(request.args.get("limit", 20))
    with get_db_session() as session:
        repo    = RatingRepository(session)
        summary = repo.summary(restaurant_id, "restaurant")
        reviews = repo.find_for_restaurant(restaurant_id, limit=limit)
        return jsonify({
            **summary,
            "reviews": [repo.to_dict(r) for r in reviews],
        }), 200


@ratings_bp.route("/admin/remove/<review_id>", methods=["DELETE"])
@require_auth(["admin"])
def remove_review(review_id: str):
    with transaction() as session:
        repo = RatingRepository(session)
        if not repo.delete_by_id(review_id):
            return jsonify({"error": "Review not found"}), 404
    logger.info(f"Admin {request.user_id} removed review {review_id}")
    return jsonify({"message": "Review removed"}), 200
