"""
╔══════════════════════════════════════════════════════════════╗
║   WOLFIE DELIVERY — seed_test_data.py                        ║
║   Creates deterministic test users, restaurant, menu,        ║
║   driver, and order for automated testing.                   ║
║                                                              ║
║   Usage:                                                     ║
║     python seed_test_data.py                                 ║
║     python seed_test_data.py --reset   (wipes and re-seeds)  ║
╚══════════════════════════════════════════════════════════════╝
"""

import os
import sys
import uuid
import argparse
import logging
from datetime import datetime, timezone, timedelta

# ── Bootstrap Flask app context ───────────────────────────────
os.environ.setdefault("FLASK_ENV", "development")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from database import transaction, get_db_session
from database.schemas import User, MenuItem, Order, Payment

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("seed_test")

UTC = timezone.utc

# ── Fixed test IDs (deterministic across runs) ────────────────
TEST_IDS = {
    "admin":      "test-admin-0000-0000-000000000001",
    "customer":   "test-cust-0000-0000-000000000002",
    "restaurant": "test-rest-0000-0000-000000000003",
    "driver":     "test-drvr-0000-0000-000000000004",
    "menu_item_1":"test-menu-0000-0000-000000000005",
    "menu_item_2":"test-menu-0000-0000-000000000006",
    "menu_item_3":"test-menu-0000-0000-000000000007",
    "order":      "test-ordr-0000-0000-000000000008",
}

TEST_PASSWORD = "TestPassword123!"


def hash_password(raw: str) -> str:
    """PBKDF2-SHA256 — identical to UserRepository.hash_password."""
    import hashlib, os
    salt = os.urandom(16).hex()
    h    = hashlib.pbkdf2_hmac("sha256", raw.encode(), salt.encode(), 260_000)
    return f"{salt}:{h.hex()}"


def _clear_test_data(session):
    """Remove all test fixture records by their fixed IDs."""
    ids = list(TEST_IDS.values())
    session.query(Order).filter(Order.id == TEST_IDS["order"]).delete()
    session.query(Payment).filter(Payment.order_id == TEST_IDS["order"]).delete()
    for mid in [TEST_IDS["menu_item_1"], TEST_IDS["menu_item_2"], TEST_IDS["menu_item_3"]]:
        session.query(MenuItem).filter(MenuItem.id == mid).delete()
    for uid in [TEST_IDS["admin"], TEST_IDS["customer"], TEST_IDS["restaurant"], TEST_IDS["driver"]]:
        session.query(User).filter(User.id == uid).delete()
    logger.info("Existing test data cleared.")


def _user_exists(session, user_id: str) -> bool:
    return session.query(User).filter(User.id == user_id).first() is not None


def seed(reset: bool = False):
    app = create_app()
    with app.app_context():
        with transaction() as session:
            if reset:
                _clear_test_data(session)

            now = datetime.now(UTC)
            pw_hash = hash_password(TEST_PASSWORD)

            # ── 1. Admin ──────────────────────────────────────
            if not _user_exists(session, TEST_IDS["admin"]):
                session.add(User(
                    id            = TEST_IDS["admin"],
                    email         = "test.admin@wolfie.delivery",
                    full_name     = "Test Admin",
                    phone         = "+10000000001",
                    role          = "admin",
                    admin_type    = "super_admin",
                    password_hash = pw_hash,
                    is_active     = True,
                    created_at    = now,
                    updated_at    = now,
                ))
                logger.info("Admin created: test.admin@wolfie.delivery")
            else:
                logger.info("Admin already exists, skipping.")

            # ── 2. Customer ───────────────────────────────────
            if not _user_exists(session, TEST_IDS["customer"]):
                session.add(User(
                    id            = TEST_IDS["customer"],
                    email         = "test.customer@wolfie.delivery",
                    full_name     = "Test Customer",
                    phone         = "+10000000002",
                    role          = "customer",
                    password_hash = pw_hash,
                    is_active     = True,
                    created_at    = now,
                    updated_at    = now,
                ))
                logger.info("Customer created: test.customer@wolfie.delivery")
            else:
                logger.info("Customer already exists, skipping.")

            # ── 3. Restaurant ─────────────────────────────────
            if not _user_exists(session, TEST_IDS["restaurant"]):
                session.add(User(
                    id              = TEST_IDS["restaurant"],
                    email           = "test.restaurant@wolfie.delivery",
                    full_name       = "Test Restaurant Owner",
                    phone           = "+10000000003",
                    role            = "restaurant",
                    password_hash   = pw_hash,
                    is_active       = True,
                    is_open         = True,
                    restaurant_name = "Wolfie Test Kitchen",
                    chef_name       = "Chef Test",
                    bio             = "A test restaurant for automated testing.",
                    address         = "123 Test Street, New York, NY 10001",
                    latitude        = 40.7128,
                    longitude       = -74.0060,
                    category        = "American",
                    price_level     = 2,
                    delivery_time_min = 25,
                    delivery_fee    = 3.99,
                    created_at      = now,
                    updated_at      = now,
                ))
                logger.info("Restaurant created: Wolfie Test Kitchen")
            else:
                logger.info("Restaurant already exists, skipping.")

            # ── 4. Driver ─────────────────────────────────────
            if not _user_exists(session, TEST_IDS["driver"]):
                session.add(User(
                    id            = TEST_IDS["driver"],
                    email         = "test.driver@wolfie.delivery",
                    full_name     = "Test Driver",
                    phone         = "+10000000004",
                    role          = "driver",
                    password_hash = pw_hash,
                    is_active     = True,
                    is_available  = True,
                    latitude      = 40.7130,
                    longitude     = -74.0050,
                    created_at    = now,
                    updated_at    = now,
                ))
                logger.info("Driver created: test.driver@wolfie.delivery")
            else:
                logger.info("Driver already exists, skipping.")

            # Flush so menu items can reference restaurant FK
            session.flush()

            # ── 5. Menu Items ─────────────────────────────────
            menu_data = [
                (TEST_IDS["menu_item_1"], "Classic Burger",   "Beef patty, lettuce, tomato, pickles",  12.99, "Burgers"),
                (TEST_IDS["menu_item_2"], "Caesar Salad",     "Romaine, parmesan, croutons",           9.99,  "Salads"),
                (TEST_IDS["menu_item_3"], "Cheese Pizza",     "Mozzarella, tomato sauce, basil",       14.99, "Pizza"),
            ]
            for mid, name, desc, price, cat in menu_data:
                existing = session.query(MenuItem).filter(MenuItem.id == mid).first()
                if not existing:
                    session.add(MenuItem(
                        id            = mid,
                        restaurant_id = TEST_IDS["restaurant"],
                        name          = name,
                        description   = desc,
                        price         = price,
                        category      = cat,
                        is_available  = True,
                        sizes         = [],
                        created_at    = now,
                        updated_at    = now,
                    ))
                    logger.info(f"Menu item: {name} (${price})")
                else:
                    logger.info(f"Menu item '{name}' already exists, skipping.")

        # ── Print Summary ─────────────────────────────────────
        print("\n" + "=" * 60)
        print("WOLFIE TEST SEED COMPLETE")
        print("=" * 60)
        print(f"\n{'Role':<12} {'Email':<40} {'Password'}")
        print("-" * 70)
        rows = [
            ("admin",      "test.admin@wolfie.delivery"),
            ("customer",   "test.customer@wolfie.delivery"),
            ("restaurant", "test.restaurant@wolfie.delivery"),
            ("driver",     "test.driver@wolfie.delivery"),
        ]
        for role, email in rows:
            print(f"{role:<12} {email:<40} {TEST_PASSWORD}")

        print("\nTest IDs:")
        for name, tid in TEST_IDS.items():
            print(f"  {name:<14} {tid}")

        print("\nMenu items at restaurant:", TEST_IDS["restaurant"])
        print("  - Classic Burger  $12.99  id:", TEST_IDS["menu_item_1"])
        print("  - Caesar Salad    $9.99   id:", TEST_IDS["menu_item_2"])
        print("  - Cheese Pizza    $14.99  id:", TEST_IDS["menu_item_3"])
        print("=" * 60 + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed test data for Wolfie backend")
    parser.add_argument("--reset", action="store_true",
                        help="Delete existing test records before seeding")
    args = parser.parse_args()
    seed(reset=args.reset)
