"""
╔══════════════════════════════════════════════════════════════╗
║     WOLFIE DELIVERY — database/schemas.py                    ║
║     SQLAlchemy table definitions — single source of truth    ║
╚══════════════════════════════════════════════════════════════╝
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Float, Integer, Boolean, Text,
    DateTime, Date, ForeignKey, JSON, Enum, Index,
    CheckConstraint, UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

UTC = timezone.utc


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(UTC)


# ── Base ──────────────────────────────────────────────────────

class Base(DeclarativeBase):
    pass


# ══════════════════════════════════════════════════════════════
# USERS  (customer · driver · restaurant · admin)
# ══════════════════════════════════════════════════════════════

class User(Base):
    __tablename__ = "users"

    id            = Column(String(36), primary_key=True, default=_uuid)
    email         = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(512), nullable=False)
    full_name     = Column(String(255), nullable=False)
    phone         = Column(String(30),  nullable=False)
    role          = Column(
        Enum("customer", "driver", "restaurant", "admin", name="user_role"),
        nullable=False, index=True,
    )
    is_active     = Column(Boolean, default=True,  nullable=False)
    last_login    = Column(DateTime(timezone=True))
    created_at    = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at    = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    # ── Driver fields ──
    is_available       = Column(Boolean, default=False)
    total_deliveries   = Column(Integer, default=0)
    total_earnings     = Column(Float,   default=0.0)
    rating             = Column(Float,   default=5.0)
    rating_warning     = Column(Boolean, default=False)
    subscription_status= Column(String(20), default="trial")
    trial_ends_at      = Column(DateTime(timezone=True))
    kyc_status         = Column(String(20), default="not_started") # not_started, pending, approved, rejected
    kyc_documents      = Column(JSON, default=dict)


    # ── Restaurant fields ──
    restaurant_name    = Column(String(255))
    commission_rate    = Column(Float, default=0.18)
    is_open            = Column(Boolean, default=False)
    suspension_reason  = Column(Text)
    operating_hours    = Column(JSON, default=dict)
    busy_mode          = Column(Boolean, default=False)
    delivery_zones     = Column(JSON, default=list)
    chef_name          = Column(String(255))
    chef_bio           = Column(Text)
    chef_image         = Column(Text)
    story              = Column(Text)
    bio                = Column(Text)
    hero_image         = Column(Text)
    logo_image         = Column(Text)
    address            = Column(Text)
    latitude           = Column(Float)
    longitude          = Column(Float)
    category           = Column(String(100))
    price_level        = Column(String(10))
    delivery_time_min  = Column(Integer)
    delivery_fee       = Column(Float)


    # ── Customer fields ──
    total_orders       = Column(Integer, default=0)

    # ── Admin fields ──
    admin_type         = Column(String(50))

    # ── Relationships ──
    orders_as_customer = relationship("Order", foreign_keys="Order.customer_id",    back_populates="customer")
    orders_as_driver   = relationship("Order", foreign_keys="Order.driver_id",      back_populates="driver")
    orders_as_restaurant = relationship("Order", foreign_keys="Order.restaurant_id", back_populates="restaurant")
    driver_location    = relationship("DriverLocation", back_populates="driver", uselist=False)
    reviews_given      = relationship("Review", foreign_keys="Review.reviewer_id",  back_populates="reviewer")
    reviews_received   = relationship("Review", foreign_keys="Review.reviewee_id",  back_populates="reviewee")
    sync_agent         = relationship("SyncAgent", back_populates="restaurant", uselist=False)
    kitchen_metrics    = relationship("KitchenMetric", back_populates="restaurant")
    scores             = relationship("RestaurantScore", back_populates="restaurant")

    __table_args__ = (
        CheckConstraint("rating >= 1.0 AND rating <= 5.0", name="ck_user_rating"),
        CheckConstraint("commission_rate >= 0.05 AND commission_rate <= 0.30",
                        name="ck_commission_rate"),
        Index("ix_users_role_active", "role", "is_active"),
    )

    def __repr__(self):
        return f"<User {self.email} [{self.role}]>"


# ══════════════════════════════════════════════════════════════
# ORDERS
# ══════════════════════════════════════════════════════════════

class Order(Base):
    __tablename__ = "orders"

    id              = Column(String(36), primary_key=True, default=_uuid)
    customer_id     = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    restaurant_id   = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    driver_id       = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"),  index=True)

    status          = Column(
        Enum("pending","assigned","accepted","preparing","ready","picked_up",
             "on_the_way","delivered","cancelled", name="order_status"),
        default="pending", nullable=False, index=True,
    )

    # Addresses
    pickup_address   = Column(Text, nullable=False)
    delivery_address = Column(Text, nullable=False)

    # Items stored as JSON array
    items            = Column(JSON, nullable=False)

    # Pricing
    subtotal               = Column(Float, default=0.0, nullable=False)
    delivery_fee           = Column(Float, default=0.0, nullable=False)
    service_fee            = Column(Float, default=0.0, nullable=False)
    tax                    = Column(Float, default=0.0, nullable=False)
    driver_payout          = Column(Float, default=0.0, nullable=False)
    restaurant_commission  = Column(Float, default=0.0, nullable=False)
    total                  = Column(Float, default=0.0, nullable=False)
    surge_applied          = Column(Boolean, default=False)
    
    # Proof of Delivery
    proof_type             = Column(String(50), nullable=True) # photo, pin, qr, signature
    proof_photo_url        = Column(String(500), nullable=True)
    proof_metadata         = Column(JSON, nullable=True)

    # Route
    distance_km     = Column(Float)
    eta_minutes     = Column(Integer)

    # Payment
    payment_method  = Column(String(20), nullable=False)
    promo_code      = Column(String(50))

    # Cancellation
    cancellation_reason = Column(Text)

    # Timestamps
    created_at   = Column(DateTime(timezone=True), default=_now, nullable=False, index=True)
    updated_at   = Column(DateTime(timezone=True), default=_now, onupdate=_now,  nullable=False)
    picked_up_at = Column(DateTime(timezone=True))
    delivered_at = Column(DateTime(timezone=True))
    driver_accepted_at = Column(DateTime(timezone=True))
    restaurant_accepted_at = Column(DateTime(timezone=True))

    prediction_data = Column(JSON)  # Stores WAP breakdown
    eta_predicted   = Column(Float)

    # Relationships
    customer   = relationship("User", foreign_keys=[customer_id],   back_populates="orders_as_customer")
    driver     = relationship("User", foreign_keys=[driver_id],     back_populates="orders_as_driver")
    restaurant = relationship("User", foreign_keys=[restaurant_id], back_populates="orders_as_restaurant")
    payment    = relationship("Payment", back_populates="order", uselist=False)
    reviews    = relationship("Review",  back_populates="order")
    wap_prediction  = relationship("WAPPrediction", back_populates="order", uselist=False)
    kitchen_metric  = relationship("KitchenMetric", back_populates="order", uselist=False)

    __table_args__ = (
        CheckConstraint("total >= 0",         name="ck_order_total_positive"),
        CheckConstraint("subtotal >= 0",      name="ck_order_subtotal_positive"),
        CheckConstraint("driver_payout >= 0", name="ck_driver_payout_positive"),
        Index("ix_orders_status_created", "status", "created_at"),
    )

    def __repr__(self):
        return f"<Order {self.id[:8]} [{self.status}] ${self.total}>"


# ══════════════════════════════════════════════════════════════
# PAYMENTS
# ══════════════════════════════════════════════════════════════

class Payment(Base):
    __tablename__ = "payments"

    id                        = Column(String(36), primary_key=True, default=_uuid)
    order_id                  = Column(String(36), ForeignKey("orders.id", ondelete="RESTRICT"),
                                       nullable=False, unique=True, index=True)
    customer_id               = Column(String(36), ForeignKey("users.id",  ondelete="RESTRICT"),
                                       nullable=False, index=True)
    amount                    = Column(Float, nullable=False)
    method                    = Column(Enum("cash","card","stripe", name="payment_method_enum"), nullable=False)
    status                    = Column(
        Enum("pending","completed","failed","refunded", name="payment_status"),
        default="pending", nullable=False,
    )
    stripe_payment_intent_id  = Column(String(255))
    stripe_charge_id          = Column(String(255))
    stripe_refund_id          = Column(String(255))
    failure_reason            = Column(Text)
    created_at                = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at                = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    order = relationship("Order", back_populates="payment")

    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_payment_amount_positive"),
    )


# ══════════════════════════════════════════════════════════════
# DRIVER LOCATIONS
# ══════════════════════════════════════════════════════════════

class DriverLocation(Base):
    __tablename__ = "driver_locations"

    driver_id  = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"),
                        primary_key=True)
    order_id   = Column(String(36), ForeignKey("orders.id", ondelete="SET NULL"))
    lat        = Column(Float, nullable=False)
    lng        = Column(Float, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    driver = relationship("User", back_populates="driver_location")

    __table_args__ = (
        CheckConstraint("lat  >= -90  AND lat  <= 90",  name="ck_lat_range"),
        CheckConstraint("lng >= -180 AND lng <= 180",   name="ck_lng_range"),
        Index("ix_driver_locations_updated", "updated_at"),
    )


# ══════════════════════════════════════════════════════════════
# MENU ITEMS
# ══════════════════════════════════════════════════════════════

class MenuItem(Base):
    __tablename__ = "menu_items"

    id            = Column(String(36), primary_key=True, default=_uuid)
    restaurant_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"),
                           nullable=False, index=True)
    name          = Column(String(255), nullable=False)
    description   = Column(Text, default="")
    price         = Column(Float, nullable=False)
    category      = Column(String(100), nullable=False, index=True)
    image_url     = Column(Text)
    is_available  = Column(Boolean, default=True, nullable=False)
    created_at    = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at    = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    __table_args__ = (
        CheckConstraint("price > 0", name="ck_menu_price_positive"),
        Index("ix_menu_restaurant_category", "restaurant_id", "category"),
    )


# ══════════════════════════════════════════════════════════════
# REVIEWS
# ══════════════════════════════════════════════════════════════

class Review(Base):
    __tablename__ = "reviews"

    id          = Column(String(36), primary_key=True, default=_uuid)
    order_id    = Column(String(36), ForeignKey("orders.id", ondelete="CASCADE"),
                         nullable=False, index=True)
    reviewer_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reviewee_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role        = Column(Enum("driver","restaurant", name="review_role"), nullable=False)
    rating      = Column(Integer, nullable=False)
    comment     = Column(Text, default="")
    created_at  = Column(DateTime(timezone=True), default=_now, nullable=False)

    order    = relationship("Order",  back_populates="reviews")
    reviewer = relationship("User",   foreign_keys=[reviewer_id], back_populates="reviews_given")
    reviewee = relationship("User",   foreign_keys=[reviewee_id], back_populates="reviews_received")

    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_review_rating"),
        UniqueConstraint("order_id", "reviewee_id", name="uq_order_reviewee"),
    )


# ══════════════════════════════════════════════════════════════
# DRIVER PAYOUTS
# ══════════════════════════════════════════════════════════════

class DriverPayout(Base):
    __tablename__ = "driver_payouts"

    id         = Column(String(36), primary_key=True, default=_uuid)
    driver_id  = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"),
                        nullable=False, index=True)
    order_id   = Column(String(36), ForeignKey("orders.id", ondelete="RESTRICT"),
                        nullable=False, unique=True)
    amount     = Column(Float, nullable=False)
    status     = Column(Enum("pending","paid","failed", name="payout_status"), default="pending")
    week_start = Column(String(20))
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_driver_payout_amount"),
    )


# ══════════════════════════════════════════════════════════════
# DRIVER DECLINES
# ══════════════════════════════════════════════════════════════

class DriverDeclineLog(Base):
    __tablename__ = "driver_decline_logs"

    id         = Column(String(36), primary_key=True, default=_uuid)
    driver_id  = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    order_id   = Column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)

    driver = relationship("User", foreign_keys=[driver_id])
    order = relationship("Order", foreign_keys=[order_id])

# ══════════════════════════════════════════════════════════════
# IDEMPOTENCY KEYS
# ══════════════════════════════════════════════════════════════

class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"

    key          = Column(String(255), primary_key=True)
    response_body = Column(JSON, nullable=True)
    status_code  = Column(Integer, nullable=True)
    created_at   = Column(DateTime(timezone=True), default=_now, nullable=False)

# ══════════════════════════════════════════════════════════════
# RESTAURANT PAYOUTS
# ══════════════════════════════════════════════════════════════

class RestaurantOrderPayout(Base):
    __tablename__ = "restaurant_order_payouts"

    id            = Column(String(36), primary_key=True, default=_uuid)
    restaurant_id = Column(String(36), ForeignKey("users.id",  ondelete="RESTRICT"),
                           nullable=False, index=True)
    order_id      = Column(String(36), ForeignKey("orders.id", ondelete="RESTRICT"),
                           nullable=False, unique=True)
    net_amount    = Column(Float, nullable=False)
    commission    = Column(Float, nullable=False)
    status        = Column(Enum("pending","paid","failed", name="rest_payout_status"), default="pending")
    created_at    = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at    = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    __table_args__ = (
        CheckConstraint("net_amount >= 0",  name="ck_rest_order_net_positive"),
        CheckConstraint("commission >= 0",  name="ck_rest_order_commission_positive"),
    )


# ══════════════════════════════════════════════════════════════
# APP CONFIG  (for dynamic settings like rating thresholds)
# ══════════════════════════════════════════════════════════════

class AppConfig(Base):
    __tablename__ = "app_config"

    key        = Column(String(100), primary_key=True)
    value      = Column(Text,  nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)


# ══════════════════════════════════════════════════════════════
# WAP (Wolfie AI Prediction) TABLES
# ══════════════════════════════════════════════════════════════

class WAPPrediction(Base):
    """Stored prediction for each order."""
    __tablename__ = 'wap_predictions'

    id = Column(String(36), primary_key=True, default=_uuid)
    order_id = Column(String(36), ForeignKey('orders.id'), nullable=False, unique=True)
    restaurant_id = Column(String(36), ForeignKey('users.id'), nullable=False)

    prep_time_min = Column(Float)
    drive_time_min = Column(Float)
    buffer_min = Column(Float)
    total_eta_min = Column(Float)
    confidence = Column(Float)  # 0.0 - 1.0
    breakdown = Column(Text)  # JSON string
    predicted_at = Column(DateTime(timezone=True))
    wap_version = Column(String(10))
    model_version = Column(String(20))

    order = relationship("Order", back_populates="wap_prediction")


class WAPFeedback(Base):
    """Feedback after order completion — for ML training."""
    __tablename__ = 'wap_feedback'

    id = Column(String(36), primary_key=True, default=_uuid)
    order_id = Column(String(36), ForeignKey('orders.id'), nullable=False)
    restaurant_id = Column(String(36), ForeignKey('users.id'))

    predicted_total = Column(Float)
    actual_total = Column(Float)
    error_min = Column(Float)
    error_percentage = Column(Float)
    prep_error = Column(Float)
    drive_error = Column(Float)
    model_version = Column(String(20))
    learned = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=_now)


class WAPModelMetrics(Base):
    """Track ML model performance over time."""
    __tablename__ = 'wap_model_metrics'

    id = Column(String(36), primary_key=True, default=_uuid)
    restaurant_id = Column(String(36), ForeignKey('users.id'))

    mae = Column(Float)
    rmse = Column(Float)
    mape = Column(Float)
    r2_score = Column(Float)
    training_samples = Column(Integer)
    feature_importance = Column(Text)  # JSON
    model_version = Column(String(20))
    trained_at = Column(DateTime(timezone=True))


# ══════════════════════════════════════════════════════════════
# SYNC AGENT TABLES
# ══════════════════════════════════════════════════════════════

class SyncAgent(Base):
    """Wolfie Sync Agent installed in restaurant."""
    __tablename__ = 'sync_agents'

    id = Column(String(36), primary_key=True, default=_uuid)
    restaurant_id = Column(String(36), ForeignKey('users.id'), nullable=False, unique=True)
    device_fingerprint = Column(String(64), nullable=False, unique=True)
    device_name = Column(String(100))
    pos_type = Column(String(20))
    pos_version = Column(String(20))
    agent_version = Column(String(10), default='1.0.0')

    status = Column(String(20), default='pending')
    installed_at = Column(DateTime(timezone=True), default=_now)
    last_heartbeat = Column(DateTime(timezone=True))
    last_sync_at = Column(DateTime(timezone=True))

    ip_address = Column(String(45))
    port = Column(Integer, default=8080)
    total_orders_synced = Column(Integer, default=0)
    total_errors = Column(Integer, default=0)
    uptime_percentage = Column(Float, default=0.0)

    restaurant = relationship("User", back_populates="sync_agent")
    metrics = relationship("KitchenMetric", back_populates="agent", cascade="all, delete-orphan")

    def is_online(self):
        if not self.last_heartbeat:
            return False
        return (datetime.now(UTC) - self.last_heartbeat).total_seconds() < 300


class KitchenMetric(Base):
    """Raw kitchen timing data from Sync Agent."""
    __tablename__ = 'kitchen_metrics'

    id = Column(String(36), primary_key=True, default=_uuid)
    agent_id = Column(String(36), ForeignKey('sync_agents.id'), nullable=False)
    restaurant_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    order_id = Column(String(36), ForeignKey('orders.id'))

    pos_received_at = Column(DateTime(timezone=True))
    kitchen_started_at = Column(DateTime(timezone=True))
    kitchen_ready_at = Column(DateTime(timezone=True))
    driver_assigned_at = Column(DateTime(timezone=True))
    driver_arrived_at = Column(DateTime(timezone=True))
    handoff_at = Column(DateTime(timezone=True))

    queue_duration = Column(Float)
    prep_duration = Column(Float)
    wait_for_driver = Column(Float)
    total_kitchen_time = Column(Float)

    total_items = Column(Integer, default=0)
    complex_items = Column(Integer, default=0)
    rush_hour = Column(Boolean, default=False)
    day_of_week = Column(Integer)
    hour_of_day = Column(Integer)

    predicted_prep_time = Column(Float)
    actual_prep_time = Column(Float)
    prediction_error = Column(Float)
    raw_pos_data = Column(Text)
    created_at = Column(DateTime(timezone=True), default=_now)

    agent = relationship("SyncAgent", back_populates="metrics")
    restaurant = relationship("User", back_populates="kitchen_metrics")
    order = relationship("Order", back_populates="kitchen_metric")


class RestaurantScore(Base):
    """Calculated score for restaurant performance."""
    __tablename__ = 'restaurant_scores'

    id = Column(String(36), primary_key=True, default=_uuid)
    restaurant_id = Column(String(36), ForeignKey('users.id'), nullable=False)

    speed_score = Column(Float, default=0.0)
    accuracy_score = Column(Float, default=0.0)
    consistency_score = Column(Float, default=0.0)
    reliability_score = Column(Float, default=0.0)
    customer_satisfaction = Column(Float, default=0.0)

    overall_score = Column(Float, default=0.0)
    tier = Column(String(20), default='unranked')

    data_points = Column(Integer, default=0)
    calculation_window_days = Column(Integer, default=7)
    calculated_at = Column(DateTime(timezone=True), default=_now)

    previous_score = Column(Float)
    trend_direction = Column(String(10))
    trend_percentage = Column(Float)

    restaurant = relationship("User", back_populates="scores")


class ScoreHistory(Base):
    """Daily score snapshots for trend analysis."""
    __tablename__ = 'score_history'

    id = Column(String(36), primary_key=True, default=_uuid)
    restaurant_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    date = Column(Date, nullable=False)

    speed_score = Column(Float)
    accuracy_score = Column(Float)
    consistency_score = Column(Float)
    overall_score = Column(Float)

    orders_count = Column(Integer)
    avg_prep_time = Column(Float)

    __table_args__ = (UniqueConstraint('restaurant_id', 'date', name='unique_daily_score'),)

# ══════════════════════════════════════════════════════════════
# SUPPORT & MODERATION (ADMIN)
# ══════════════════════════════════════════════════════════════

class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id          = Column(String(36), primary_key=True, default=_uuid)
    user_id     = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    order_id    = Column(String(36), ForeignKey("orders.id", ondelete="SET NULL"), index=True)
    category    = Column(String(50), nullable=False, index=True)
    priority    = Column(String(20), default="low")
    status      = Column(String(20), default="open", index=True)
    assigned_to = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"))
    ai_summary  = Column(Text)
    resolution  = Column(Text)
    created_at  = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at  = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    user = relationship("User", foreign_keys=[user_id])
    assignee = relationship("User", foreign_keys=[assigned_to])
    order = relationship("Order")


class RefundRequest(Base):
    __tablename__ = "refund_requests"

    id                 = Column(String(36), primary_key=True, default=_uuid)
    order_id           = Column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id            = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    refund_type        = Column(String(50), nullable=False)
    amount_requested   = Column(Float, nullable=False)
    recommended_amount = Column(Float)
    fraud_score        = Column(Float)
    evidence_data      = Column(JSON)
    status             = Column(String(20), default="pending", index=True)
    reviewed_by        = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"))
    created_at         = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at         = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    order = relationship("Order")
    user = relationship("User", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])


class FraudFlag(Base):
    __tablename__ = "fraud_flags"

    id         = Column(String(36), primary_key=True, default=_uuid)
    user_id    = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    risk_type  = Column(String(50), nullable=False)
    severity   = Column(String(20), nullable=False)
    notes      = Column(Text)
    evidence   = Column(JSON)
    status     = Column(String(20), default="open")
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)

    user = relationship("User", foreign_keys=[user_id])


class SupportLog(Base):
    __tablename__ = "support_logs"

    id          = Column(String(36), primary_key=True, default=_uuid)
    actor_id    = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), index=True)
    actor_role  = Column(String(50))
    action      = Column(String(100), nullable=False)
    target_type = Column(String(50), nullable=False)
    target_id   = Column(String(36), nullable=False)
    meta_data   = Column("metadata", JSON)
    ip_address  = Column(String(45))
    created_at  = Column(DateTime(timezone=True), default=_now, nullable=False)

# ══════════════════════════════════════════════════════════════
# MERCHANT ONBOARDING & FINANCE MODELS
# ══════════════════════════════════════════════════════════════
# Import new domain models to register them under the same Base
from models.legal_acceptance import (  # noqa: F401
    LegalPolicyVersion, UserLegalAcceptance, ComplianceAuditLog,
    RestaurantLegalAcceptance
)
from models.payout import (  # noqa: F401
    RestaurantPayoutAccount, RestaurantBalance,
    RestaurantPayout, RestaurantTransaction
)
from models.ai_subscription import RestaurantAISubscription  # noqa: F401
from models.audit_log import RestaurantAuditLog  # noqa: F401


# ══════════════════════════════════════════════════════════════
# NOTIFICATIONS, ADDRESSES, CHAT, & FAVORITES
# ══════════════════════════════════════════════════════════════

class Notification(Base):
    __tablename__ = "notifications"

    id          = Column(String(36), primary_key=True, default=_uuid)
    user_id     = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type        = Column(String(50), nullable=False)
    title       = Column(String(255), nullable=False)
    body        = Column(Text, nullable=False)
    icon        = Column(String(50), default="bell")
    order_id    = Column(String(36), ForeignKey("orders.id", ondelete="SET NULL"))
    link        = Column(String(500))
    is_read     = Column(Boolean, default=False, nullable=False)
    created_at  = Column(DateTime(timezone=True), default=_now, nullable=False)

    user = relationship("User", foreign_keys=[user_id])
    order = relationship("Order", foreign_keys=[order_id])


class Address(Base):
    __tablename__ = "addresses"

    id            = Column(String(36), primary_key=True, default=_uuid)
    user_id       = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    street        = Column(String(255), nullable=False)
    apt           = Column(String(50))
    city          = Column(String(100), nullable=False)
    notes         = Column(Text)
    label         = Column(String(50), default="Home")
    is_default    = Column(Boolean, default=False, nullable=False)
    created_at    = Column(DateTime(timezone=True), default=_now, nullable=False)

    user = relationship("User", foreign_keys=[user_id])


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id          = Column(String(36), primary_key=True, default=_uuid)
    order_id    = Column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id   = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    sender_type = Column(String(20), nullable=False)
    message     = Column(Text, nullable=False)
    is_read     = Column(Boolean, default=False, nullable=False)
    created_at  = Column(DateTime(timezone=True), default=_now, nullable=False)

    order = relationship("Order")
    sender = relationship("User", foreign_keys=[sender_id])


class Favorite(Base):
    __tablename__ = "favorites"

    id            = Column(String(36), primary_key=True, default=_uuid)
    user_id       = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    restaurant_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at    = Column(DateTime(timezone=True), default=_now, nullable=False)

    user = relationship("User", foreign_keys=[user_id])
    restaurant = relationship("User", foreign_keys=[restaurant_id])


