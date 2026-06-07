"""
╔══════════════════════════════════════════════════════════════╗
║     WOLFIE DELIVERY — database/repositories/user.py          ║
╚══════════════════════════════════════════════════════════════╝
"""

import uuid, hashlib, hmac, os
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from database.repositories.base import BaseRepository
from database.schemas import User

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
        return self.session.scalars(
            select(User).where(
                User.role == "driver",
                User.is_active == True,
                User.is_available == True,
            )
        ).all()

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
            
            # Map detailed profile fields
            if extra.get("chef_name"): user.chef_name = extra["chef_name"].strip()
            if extra.get("chef_bio"): user.chef_bio = extra["chef_bio"].strip()
            if extra.get("chef_image"): user.chef_image = extra["chef_image"].strip()
            if extra.get("story"): user.story = extra["story"].strip()
            if extra.get("bio"): user.bio = extra["bio"].strip()
            if extra.get("hero_image"): user.hero_image = extra["hero_image"].strip()
            if extra.get("logo_image"): user.logo_image = extra["logo_image"].strip()
            if extra.get("address"): user.address = extra["address"].strip()
            if extra.get("latitude") is not None: user.latitude = float(extra["latitude"])
            if extra.get("longitude") is not None: user.longitude = float(extra["longitude"])
            if extra.get("category"): user.category = extra["category"].strip()
            if extra.get("price_level"): user.price_level = extra["price_level"].strip()
            if extra.get("delivery_time_min") is not None: user.delivery_time_min = int(extra["delivery_time_min"])
            if extra.get("delivery_fee") is not None: user.delivery_fee = float(extra["delivery_fee"])

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
