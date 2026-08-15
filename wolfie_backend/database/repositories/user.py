"""
╔══════════════════════════════════════════════════════════════╗
║     WOLFIE DELIVERY — database/repositories/user.py          ║
╚══════════════════════════════════════════════════════════════╝
"""

import uuid, hashlib, hmac, os, time, re
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, func, and_
from database.repositories.base import BaseRepository
from database.schemas import User, Order

UTC = timezone.utc
VALID_ROLES = {"customer", "driver", "restaurant", "admin"}


class UserRepository(BaseRepository[User]):
    model = User

    # ── Finders ──────────────────────────────

    def find_by_email(self, email: str) -> User | None:
        t0 = time.monotonic()
        try:
            return self.find_by(email=email.lower().strip())
        finally:
            from services.metrics import dep_latency
            dep_latency.labels(service="db_find_user_by_email").observe(time.monotonic() - t0)

    def find_active(self, user_id: str) -> User | None:
        cache = None
        key = f"user:active:dict:{user_id}"
        try:
            from flask import current_app
            cache = current_app.redis.cache
            cached_dict = cache.get(key)
            if cached_dict:
                return User(**cached_dict)
        except Exception:
            pass

        obj = self.session.scalar(
            select(User).where(User.id == user_id, User.is_active == True)
        )
        
        if obj and cache:
            try:
                cache.set(key, self.to_dict(obj, exclude={"password_hash"}), ttl=300)
            except Exception:
                pass
                
        return obj

    def find_by_role(self, role: str, limit: int = 50, offset: int = 0) -> list[User]:
        return self.list(filters={"role": role}, order_by="created_at",
                         limit=limit, offset=offset)

    def find_available_drivers(self) -> list[User]:
        """
        Find drivers available for assignment.
        Excludes drivers with active orders (double-booking prevention).
        Uses row-level locking on PostgreSQL (no-op on SQLite).
        
        Active order statuses: assigned, accepted, preparing, ready, picked_up, on_the_way
        """
        # Subquery: drivers with active orders
        active_order_statuses = ["assigned", "accepted", "preparing", "ready", "picked_up", "on_the_way"]
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
        if role not in {"customer", "driver", "restaurant"}:
            raise ValueError("Registration is not allowed for this role.")
        if len(password) < 8 or not re.search(r"[A-Z]", password) or not re.search(r"\d", password) or not re.search(r"[^A-Za-z0-9]", password):
            raise ValueError("Password must be at least 8 characters long and contain at least one uppercase letter, one number, and one special character.")
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
            user.is_active           = False
            user.kyc_status          = "pending"
            user.vehicle_type        = extra.get("vehicle_type", "scooter")

        elif role == "restaurant":
            if not extra.get("restaurant_name"):
                raise ValueError("restaurant_name required for restaurant role")
            restaurant_name = extra["restaurant_name"].strip()
            if len(restaurant_name) > 120:
                raise ValueError("Restaurant Name must be 120 characters or less")
            user.restaurant_name    = restaurant_name
            user.commission_rate    = 0.18
            user.is_open            = False
            user.subscription_status= "trial"
            user.trial_ends_at      = now + timedelta(days=30)
            user.is_active          = False
            user.kyc_status         = "pending"

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
        if len(new_password) < 8 or not re.search(r"[A-Z]", new_password) or not re.search(r"\d", new_password) or not re.search(r"[^A-Za-z0-9]", new_password):
            raise ValueError("Password must be at least 8 characters long and contain at least one uppercase letter, one number, and one special character.")
        return self.update(user, password_hash=self.hash_password(new_password),
                           updated_at=datetime.now(UTC))

    def set_commission(self, user: User, rate: float) -> User:
        if not (0.05 <= rate <= 0.30):
            raise ValueError("Commission must be between 0.05 and 0.30")
        return self.update(user, commission_rate=rate, updated_at=datetime.now(UTC))

    def safe_dict(self, user: User) -> dict:
        return self.to_dict(user, exclude={"password_hash"})

    def update(self, obj: User, **kwargs) -> User:
        res = super().update(obj, **kwargs)
        try:
            from flask import current_app
            current_app.redis.cache.delete(f"user:active:dict:{obj.id}")
        except Exception:
            pass
        return res

    def delete(self, obj: User) -> None:
        from database.schemas import Order
        active_statuses = ["pending", "assigned", "accepted", "preparing", "ready", "picked_up", "on_the_way"]
        
        has_active = False
        if obj.role == "customer":
            has_active = self.session.query(Order).filter(Order.customer_id == obj.id, Order.status.in_(active_statuses)).first() is not None
        elif obj.role == "driver":
            has_active = self.session.query(Order).filter(Order.driver_id == obj.id, Order.status.in_(active_statuses)).first() is not None
        elif obj.role == "restaurant":
            has_active = self.session.query(Order).filter(Order.restaurant_id == obj.id, Order.status.in_(active_statuses)).first() is not None

        if has_active:
            raise ValueError("Cannot delete account with active orders.")

        super().delete(obj)
        try:
            from flask import current_app
            current_app.redis.cache.delete(f"user:active:dict:{obj.id}")
        except Exception:
            pass

    # ── Analytics (SQL aggregation — avoids loading users into memory) ─────────

    def count_by_role(self) -> dict:
        """
        Returns {role: count, ..., total: N, active: N} using SQL.
        Much faster than list(limit=100_000) + len().
        """
        rows = self.session.execute(
            select(
                User.role,
                func.count(User.id).label("total"),
                func.sum(
                    func.cast(User.is_active, func.Integer if False else User.is_active.__class__)
                ).label("active_count")
            ).group_by(User.role)
        ).all()

        by_role   = {}
        total_all = 0
        active_all = 0
        for role, total, _active in rows:
            by_role[role] = total
            total_all    += total

        # Active count — separate aggregation to avoid type casting issues across DBs
        active_row = self.session.execute(
            select(func.count(User.id)).where(User.is_active == True)
        ).scalar()
        active_all = active_row or 0

        return {"total": total_all, "by_role": by_role, "active": active_all}
