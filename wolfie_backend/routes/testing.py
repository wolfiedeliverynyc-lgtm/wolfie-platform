"""
╔══════════════════════════════════════════════════════════════╗
║   WOLFIE DELIVERY — routes/testing.py                        ║
║   Dev/test-only endpoints — DISABLED in production           ║
╚══════════════════════════════════════════════════════════════╝
"""
import os
import logging
from flask import Blueprint, jsonify, current_app
from database import transaction
from database.schemas import User, MenuItem, Order, Payment

testing_bp = Blueprint("testing", __name__)
logger = logging.getLogger("wolfie")

# Fixed test IDs — same as seed_test_data.py
TEST_IDS = {
    "admin":       "test-admin-0000-0000-000000000001",
    "customer":    "test-cust-0000-0000-000000000002",
    "restaurant":  "test-rest-0000-0000-000000000003",
    "driver":      "test-drvr-0000-0000-000000000004",
    "menu_item_1": "test-menu-0000-0000-000000000005",
    "menu_item_2": "test-menu-0000-0000-000000000006",
    "menu_item_3": "test-menu-0000-0000-000000000007",
    "order":       "test-ordr-0000-0000-000000000008",
}


def _is_test_env() -> bool:
    """Only allow test endpoints in development/testing environments."""
    env = os.getenv("FLASK_ENV", "development")
    return env in ("development", "testing")


@testing_bp.route("/reset", methods=["DELETE"])
def reset_test_data():
    """
    DELETE /api/v1/testing/reset

    Deletes all seeded test data and re-seeds it from scratch.
    Only available in development/testing environments.
    """
    if not _is_test_env():
        return jsonify({"error": "Not available in production"}), 403

    try:
        with transaction() as session:
            # Clear in FK-safe order
            session.query(Order).filter(Order.id == TEST_IDS["order"]).delete()
            session.query(Payment).filter(Payment.order_id == TEST_IDS["order"]).delete()
            for mid in [TEST_IDS["menu_item_1"], TEST_IDS["menu_item_2"], TEST_IDS["menu_item_3"]]:
                session.query(MenuItem).filter(MenuItem.id == mid).delete()
            for uid in [TEST_IDS["admin"], TEST_IDS["customer"], TEST_IDS["restaurant"], TEST_IDS["driver"]]:
                session.query(User).filter(User.id == uid).delete()

        logger.info("Test data reset via API endpoint.")
    except Exception as e:
        logger.error(f"reset_test_data: {e}")
        return jsonify({"error": "Reset failed", "detail": str(e)}), 500

    # Re-seed
    try:
        from seed_test_data import seed
        seed(reset=False)
        logger.info("Test data re-seeded.")
    except Exception as e:
        logger.error(f"re-seed after reset failed: {e}")
        return jsonify({"error": "Reset succeeded but re-seed failed", "detail": str(e)}), 500

    return jsonify({
        "message": "Test data reset and re-seeded successfully",
        "test_credentials": {
            "admin":      {"email": "test.admin@wolfie.delivery",      "password": "TestPassword123!"},
            "customer":   {"email": "test.customer@wolfie.delivery",   "password": "TestPassword123!"},
            "restaurant": {"email": "test.restaurant@wolfie.delivery", "password": "TestPassword123!"},
            "driver":     {"email": "test.driver@wolfie.delivery",     "password": "TestPassword123!"},
        },
        "test_ids": TEST_IDS,
    }), 200


@testing_bp.route("/status", methods=["GET"])
def testing_status():
    """
    GET /api/v1/testing/status

    Returns whether test fixtures exist in the database.
    """
    if not _is_test_env():
        return jsonify({"error": "Not available in production"}), 403

    from database import get_db_session
    with get_db_session() as session:
        fixtures = {}
        for name, tid in TEST_IDS.items():
            if "menu" in name:
                fixtures[name] = session.query(MenuItem).filter(MenuItem.id == tid).first() is not None
            elif name == "order":
                fixtures[name] = session.query(Order).filter(Order.id == tid).first() is not None
            else:
                fixtures[name] = session.query(User).filter(User.id == tid).first() is not None

    all_present = all(fixtures.values())
    return jsonify({
        "seeded": all_present,
        "fixtures": fixtures,
        "environment": os.getenv("FLASK_ENV", "development"),
    }), 200
