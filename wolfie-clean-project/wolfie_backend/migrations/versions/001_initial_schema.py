"""Initial schema — all Wolfie tables

Revision ID: 001
Revises:
Create Date: 2025-01-01
"""

from alembic import op
import sqlalchemy as sa

revision = "001"
down_revision = None
branch_labels = None
depends_on    = None


def upgrade() -> None:
    # ── users ─────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id",            sa.String(36),  primary_key=True),
        sa.Column("email",         sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(512), nullable=False),
        sa.Column("full_name",     sa.String(255), nullable=False),
        sa.Column("phone",         sa.String(30),  nullable=False),
        sa.Column("role",          sa.Enum("customer","driver","restaurant","admin",
                                           name="user_role"), nullable=False),
        sa.Column("is_active",     sa.Boolean,     default=True,  nullable=False),
        sa.Column("last_login",    sa.DateTime(timezone=True)),
        sa.Column("created_at",    sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at",    sa.DateTime(timezone=True), nullable=False),
        # Driver
        sa.Column("is_available",        sa.Boolean,  default=False),
        sa.Column("total_deliveries",    sa.Integer,  default=0),
        sa.Column("total_earnings",      sa.Float,    default=0.0),
        sa.Column("rating",              sa.Float,    default=5.0),
        sa.Column("rating_warning",      sa.Boolean,  default=False),
        sa.Column("subscription_status", sa.String(20), default="trial"),
        sa.Column("trial_ends_at",       sa.DateTime(timezone=True)),
        sa.Column("stripe_subscription_id", sa.String(255)),
        # Restaurant
        sa.Column("restaurant_name",  sa.String(255)),
        sa.Column("commission_rate",  sa.Float, default=0.18),
        sa.Column("is_open",          sa.Boolean, default=False),
        sa.Column("suspension_reason",sa.Text),
        # Customer
        sa.Column("total_orders", sa.Integer, default=0),
        # Constraints
        sa.CheckConstraint("rating >= 1.0 AND rating <= 5.0",               name="ck_user_rating"),
        sa.CheckConstraint("commission_rate >= 0.05 AND commission_rate <= 0.30", name="ck_commission_rate"),
    )
    op.create_index("ix_users_email",       "users", ["email"],      unique=True)
    op.create_index("ix_users_role",        "users", ["role"])
    op.create_index("ix_users_role_active", "users", ["role","is_active"])

    # ── orders ────────────────────────────────────────────────
    op.create_table(
        "orders",
        sa.Column("id",            sa.String(36), primary_key=True),
        sa.Column("customer_id",   sa.String(36), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("restaurant_id", sa.String(36), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("driver_id",     sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("status", sa.Enum(
            "pending","assigned","accepted","preparing","picked_up",
            "on_the_way","delivered","cancelled", name="order_status"
        ), default="pending", nullable=False),
        sa.Column("pickup_address",   sa.Text, nullable=False),
        sa.Column("delivery_address", sa.Text, nullable=False),
        sa.Column("items",            sa.JSON, nullable=False),
        sa.Column("subtotal",              sa.Float, default=0.0),
        sa.Column("delivery_fee",          sa.Float, default=0.0),
        sa.Column("service_fee",           sa.Float, default=0.0),
        sa.Column("driver_payout",         sa.Float, default=0.0),
        sa.Column("restaurant_commission", sa.Float, default=0.0),
        sa.Column("total",                 sa.Float, default=0.0),
        sa.Column("surge_applied",         sa.Boolean, default=False),
        sa.Column("distance_km",      sa.Float),
        sa.Column("eta_minutes",      sa.Integer),
        sa.Column("payment_method",   sa.String(20), nullable=False),
        sa.Column("promo_code",       sa.String(50)),
        sa.Column("cancellation_reason", sa.Text),
        sa.Column("created_at",    sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at",    sa.DateTime(timezone=True), nullable=False),
        sa.Column("picked_up_at",  sa.DateTime(timezone=True)),
        sa.Column("delivered_at",  sa.DateTime(timezone=True)),
        sa.CheckConstraint("total >= 0",         name="ck_order_total_positive"),
        sa.CheckConstraint("driver_payout >= 0", name="ck_driver_payout_positive"),
    )
    op.create_index("ix_orders_customer",       "orders", ["customer_id"])
    op.create_index("ix_orders_restaurant",     "orders", ["restaurant_id"])
    op.create_index("ix_orders_driver",         "orders", ["driver_id"])
    op.create_index("ix_orders_status",         "orders", ["status"])
    op.create_index("ix_orders_status_created", "orders", ["status","created_at"])

    # ── payments ──────────────────────────────────────────────
    op.create_table(
        "payments",
        sa.Column("id",          sa.String(36), primary_key=True),
        sa.Column("order_id",    sa.String(36), sa.ForeignKey("orders.id", ondelete="RESTRICT"), nullable=False, unique=True),
        sa.Column("customer_id", sa.String(36), sa.ForeignKey("users.id",  ondelete="RESTRICT"), nullable=False),
        sa.Column("amount",      sa.Float,      nullable=False),
        sa.Column("method",      sa.Enum("cash","card","stripe", name="payment_method_enum"), nullable=False),
        sa.Column("status",      sa.Enum("pending","completed","failed","refunded", name="payment_status"), default="pending"),
        sa.Column("stripe_payment_intent_id", sa.String(255)),
        sa.Column("stripe_charge_id",         sa.String(255)),
        sa.Column("stripe_refund_id",         sa.String(255)),
        sa.Column("failure_reason", sa.Text),
        sa.Column("created_at",  sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at",  sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("amount > 0", name="ck_payment_amount_positive"),
    )
    op.create_index("ix_payments_order",    "payments", ["order_id"],    unique=True)
    op.create_index("ix_payments_customer", "payments", ["customer_id"])

    # ── driver_locations ──────────────────────────────────────
    op.create_table(
        "driver_locations",
        sa.Column("driver_id", sa.String(36), sa.ForeignKey("users.id",  ondelete="CASCADE"), primary_key=True),
        sa.Column("order_id",  sa.String(36), sa.ForeignKey("orders.id", ondelete="SET NULL")),
        sa.Column("lat",       sa.Float, nullable=False),
        sa.Column("lng",       sa.Float, nullable=False),
        sa.Column("updated_at",sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("lat  >= -90  AND lat  <= 90",  name="ck_lat_range"),
        sa.CheckConstraint("lng >= -180 AND lng <= 180",   name="ck_lng_range"),
    )

    # ── menu_items ────────────────────────────────────────────
    op.create_table(
        "menu_items",
        sa.Column("id",            sa.String(36),  primary_key=True),
        sa.Column("restaurant_id", sa.String(36),  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name",          sa.String(255), nullable=False),
        sa.Column("description",   sa.Text,        default=""),
        sa.Column("price",         sa.Float,       nullable=False),
        sa.Column("category",      sa.String(100), nullable=False),
        sa.Column("image_url",     sa.Text),
        sa.Column("is_available",  sa.Boolean,     default=True, nullable=False),
        sa.Column("created_at",    sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at",    sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("price > 0", name="ck_menu_price_positive"),
    )
    op.create_index("ix_menu_restaurant",          "menu_items", ["restaurant_id"])
    op.create_index("ix_menu_restaurant_category", "menu_items", ["restaurant_id","category"])

    # ── reviews ───────────────────────────────────────────────
    op.create_table(
        "reviews",
        sa.Column("id",          sa.String(36), primary_key=True),
        sa.Column("order_id",    sa.String(36), sa.ForeignKey("orders.id",  ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("reviewer_id", sa.String(36), sa.ForeignKey("users.id",   ondelete="CASCADE"), nullable=False),
        sa.Column("reviewee_id", sa.String(36), sa.ForeignKey("users.id",   ondelete="CASCADE"), nullable=False),
        sa.Column("role",        sa.Enum("driver","restaurant", name="review_role"), nullable=False),
        sa.Column("rating",      sa.Integer,    nullable=False),
        sa.Column("comment",     sa.Text,       default=""),
        sa.Column("created_at",  sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("rating >= 1 AND rating <= 5", name="ck_review_rating"),
    )
    op.create_index("ix_reviews_reviewee", "reviews", ["reviewee_id"])

    # ── driver_payouts ────────────────────────────────────────
    op.create_table(
        "driver_payouts",
        sa.Column("id",         sa.String(36), primary_key=True),
        sa.Column("driver_id",  sa.String(36), sa.ForeignKey("users.id",  ondelete="RESTRICT"), nullable=False),
        sa.Column("order_id",   sa.String(36), sa.ForeignKey("orders.id", ondelete="RESTRICT"), nullable=False, unique=True),
        sa.Column("amount",     sa.Float,      nullable=False),
        sa.Column("status",     sa.Enum("pending","paid","failed", name="payout_status"), default="pending"),
        sa.Column("week_start", sa.String(20)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("amount > 0", name="ck_driver_payout_amount"),
    )
    op.create_index("ix_driver_payouts_driver", "driver_payouts", ["driver_id"])

    # ── restaurant_payouts ────────────────────────────────────
    op.create_table(
        "restaurant_payouts",
        sa.Column("id",            sa.String(36), primary_key=True),
        sa.Column("restaurant_id", sa.String(36), sa.ForeignKey("users.id",  ondelete="RESTRICT"), nullable=False),
        sa.Column("order_id",      sa.String(36), sa.ForeignKey("orders.id", ondelete="RESTRICT"), nullable=False, unique=True),
        sa.Column("net_amount",    sa.Float,      nullable=False),
        sa.Column("commission",    sa.Float,      nullable=False),
        sa.Column("status",        sa.Enum("pending","paid","failed", name="rest_payout_status"), default="pending"),
        sa.Column("created_at",    sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at",    sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("net_amount >= 0", name="ck_rest_net_positive"),
    )
    op.create_index("ix_restaurant_payouts_restaurant", "restaurant_payouts", ["restaurant_id"])

    # ── app_config ────────────────────────────────────────────
    op.create_table(
        "app_config",
        sa.Column("key",        sa.String(100), primary_key=True),
        sa.Column("value",      sa.Text,        nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("app_config")
    op.drop_table("restaurant_payouts")
    op.drop_table("driver_payouts")
    op.drop_table("reviews")
    op.drop_table("menu_items")
    op.drop_table("driver_locations")
    op.drop_table("payments")
    op.drop_table("orders")
    op.drop_table("users")
    # Drop enums
    for enum in ["user_role","order_status","payment_method_enum",
                 "payment_status","review_role","payout_status","rest_payout_status"]:
        sa.Enum(name=enum).drop(op.get_bind(), checkfirst=True)
