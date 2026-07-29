"""
╔══════════════════════════════════════════════════════════════╗
║     WOLFIE DELIVERY — database/repositories/user.py          ║
╚══════════════════════════════════════════════════════════════╝
"""

import uuid, hashlib, hmac, os
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, and_
from database.repositories.base import BaseRepository
from database.schemas import User, Order

UTC = timezone.utc
VALID_ROLES = {"customer", "driver", "restaurant", "admin"}


class UserRepository(BaseRepository[User]):
    model = User

    # ── Finders ──────────────────────────────

    def find_by_email(self, email: str) -> User | None:
        return self.find_by(email=email.lower().strip())

    def find_active(self, user_id: str) -> User | None:
        return self.session.scalar(
            select(User).where(User.id == user_id, User.is_active == True)
        )

    def find_by_role(self, role: str, limit: int = 50, offset: int = 0) -> list[User]:
        return self.list(filters={"role": role}, order_by="created_at",
                         limit=limit, offset=offset)

    def find_available_drivers(self) -> list[User]:
        """
        Find drivers available for assignment.
        Excludes drivers with active orders (double-booking prevention).
        Uses row-level locking on PostgreSQL (no-op on SQLite).
        
        Active order statuses: assigned, accepted, preparing, picked_up, on_the_way
        """
        # Subquery: drivers with active orders
        active_order_statuses = ["assigned", "accepted", "preparing", "picked_up", "on_the_way"]
        drivers_with_active_orders = select(Order.driver_id).where(
            Order.status.in_(active_order_statuses),
            Order.driver_id.isnot(None)
        )
        
        # Main query: available drivers NOT in the subquery
        stmt = select(User).where(
            and_(
                User.role == "driver",
                User.is_active == True,
                User.is_available == True,
                ~User.id.in_(drivers_with_active_orders)  # NOT IN subquery
            )
        )
        
        # Row-level locking: only works on PostgreSQL (no-op on SQLite)
        # Prevents multiple threads from assigning same driver simultaneously
        try:
            stmt = stmt.with_for_update(skip_locked=True)
        except Exception:
            # SQLite doesn't support FOR UPDATE — fail gracefully
            pass
        
        return self.session.scalars(stmt).all()

    def email_exists(self, email: str) -> bool:
        return self.exists(email=email.lower().strip())

    # ── Password ─────────────────────────────

    @staticmethod
    def hash_password(password: str) -> str:
        salt = os.urandom(16).hex()
        h    = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260_000)
        return f"{salt}:{h.hex()}"

    @staticmethod
    def verify_password(password: str, stored: str) -> bool:
        try:
            salt, h = stored.split(":", 1)
            h2 = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260_000)
            return hmac.compare_digest(h, h2.hex())
        except Exception:
            return False

    # ── Create ────────────────────────────────

    def create(self, email: str, password: str, full_name: str,
               phone: str, role: str, extra: dict = None) -> User:
        if role not in VALID_ROLES:
            raise ValueError(f"Invalid role: {role}")
        if role == "admin":
            raise ValueError("Admin cannot self-register via API")
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters")
        if self.email_exists(email):
            raise ValueError("Email already registered")

        now  = datetime.now(UTC)
        user = User(
            id            = str(uuid.uuid4()),
            email         = email.lower().strip(),
            password_hash = self.hash_password(password),
            full_name     = full_name.strip(),
            phone         = phone.strip(),
            role          = role,
            is_active     = True,
            created_at    = now,
            updated_at    = now,
        )

        extra = extra or {}

        if role == "driver":
            trial_days = extra.get("trial_days", 7)
            user.subscription_status = "trial"
            user.trial_ends_at       = now + timedelta(days=trial_days)
            user.is_available        = False
            user.total_earnings      = 0.0
            user.rating              = 5.0
            user.total_deliveries    = 0

        elif role == "restaurant":
            if not extra.get("restaurant_name"):
                raise ValueError("restaurant_name required for restaurant role")
            user.restaurant_name    = extra["restaurant_name"].strip()
            user.commission_rate    = 0.18
            user.is_open            = False
            user.subscription_status= "trial"
            user.trial_ends_at      = now + timedelta(days=30)

        elif role == "customer":
            user.total_orders = 0
            user.rating       = 5.0

        return self.add(user)

    # ── Update helpers ────────────────────────

    def set_active(self, user: User, is_active: bool) -> User:
        return self.update(user, is_active=is_active, updated_at=datetime.now(UTC))

    def set_role(self, user: User, role: str) -> User:
        if role not in VALID_ROLES:
            raise ValueError(f"Invalid role: {role}")
        return self.update(user, role=role, updated_at=datetime.now(UTC))

    def record_login(self, user: User) -> User:
        return self.update(user, last_login=datetime.now(UTC))

    def update_password(self, user: User, new_password: str) -> User:
        if len(new_password) < 8:
            raise ValueError("Password too short")
        return self.update(user, password_hash=self.hash_password(new_password),
                           updated_at=datetime.now(UTC))

    def set_commission(self, user: User, rate: float) -> User:
        if not (0.05 <= rate <= 0.30):
            raise ValueError("Commission must be between 0.05 and 0.30")
        return self.update(user, commission_rate=rate, updated_at=datetime.now(UTC))

    def safe_dict(self, user: User) -> dict:
        return self.to_dict(user, exclude={"password_hash"})
