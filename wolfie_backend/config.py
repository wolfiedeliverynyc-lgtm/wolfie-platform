"""
╔══════════════════════════════════════════════════════╗
║         WOLFIE DELIVERY — config.py                  ║
╚══════════════════════════════════════════════════════╝
Copy .env.example → .env and fill in your keys.
"""

import os
from datetime import timedelta


class BaseConfig:
    # ── App ───────────────────────────────────
    SECRET_KEY          = os.getenv("SECRET_KEY", "wolfie-change-in-prod")
    JWT_SECRET_KEY      = os.getenv("JWT_SECRET_KEY", "wolfie-jwt-change-in-prod")
    JWT_ACCESS_TOKEN_EXPIRES  = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    # ── Supabase / Postgres ───────────────────
    SUPABASE_URL        = os.getenv("SUPABASE_URL")
    SUPABASE_KEY        = os.getenv("SUPABASE_KEY")
    SUPABASE_SERVICE_KEY= os.getenv("SUPABASE_SERVICE_KEY")
    DATABASE_URL        = os.getenv("DATABASE_URL")          # postgres://...

    # ── Stripe ────────────────────────────────
    STRIPE_SECRET_KEY       = os.getenv("STRIPE_SECRET_KEY")
    STRIPE_PUBLISHABLE_KEY  = os.getenv("STRIPE_PUBLISHABLE_KEY")
    STRIPE_WEBHOOK_SECRET   = os.getenv("STRIPE_WEBHOOK_SECRET")

    # ── Mapbox ────────────────────────────────
    MAPBOX_TOKEN        = os.getenv("MAPBOX_TOKEN")

    # ── Twilio ────────────────────────────────
    TWILIO_ACCOUNT_SID  = os.getenv("TWILIO_ACCOUNT_SID")
    TWILIO_AUTH_TOKEN   = os.getenv("TWILIO_AUTH_TOKEN")
    TWILIO_FROM_NUMBER  = os.getenv("TWILIO_FROM_NUMBER")

    # ── Redis ────────────────────────────────
    REDIS_URL           = os.getenv("REDIS_URL", "redis://localhost:6379")

    # ── Wolfie Business Rules ────────────────
    BASE_DELIVERY_FEE       = float(os.getenv("BASE_DELIVERY_FEE",    "4.00"))
    DELIVERY_FEE_PER_KM     = float(os.getenv("DELIVERY_FEE_PER_KM",  "0.80"))
    DELIVERY_FEE_PER_MIN    = float(os.getenv("DELIVERY_FEE_PER_MIN", "0.12"))
    SERVICE_FEE_RATE        = float(os.getenv("SERVICE_FEE_RATE",      "0.12"))
    SERVICE_FEE_MIN         = float(os.getenv("SERVICE_FEE_MIN",       "3.49"))
    SERVICE_FEE_MAX         = float(os.getenv("SERVICE_FEE_MAX",       "7.49"))
    DRIVER_SUBSCRIPTION_FEE = float(os.getenv("DRIVER_SUBSCRIPTION_FEE", "30.00"))
    TRIAL_DAYS              = int(os.getenv("TRIAL_DAYS", "7"))

    # ── Commission tiers ─────────────────────
    # (monthly_orders_threshold, commission_rate)
    COMMISSION_TIERS = [
        (0,   0.18),   # 0–49 orders/month  → 18%
        (50,  0.15),   # 50–99              → 15%
        (100, 0.12),   # 100–199            → 12%
        (200, 0.10),   # 200+               → 10%
    ]

    # ── Surge / Weather ───────────────────────
    SURGE_MULTIPLIER_MAX    = float(os.getenv("SURGE_MULTIPLIER_MAX", "2.5"))
    WEATHER_RAIN_MULTIPLIER = float(os.getenv("WEATHER_RAIN_MULTIPLIER", "1.25"))

    # ── CORS ──────────────────────────────────
    ALLOWED_ORIGINS = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://localhost:5173,https://wolfiedelivery.com"
    ).split(",")

    # ── Misc ──────────────────────────────────
    MAX_CONTENT_LENGTH   = 16 * 1024 * 1024   # 16 MB upload limit
    PROPAGATE_EXCEPTIONS = True


class DevelopmentConfig(BaseConfig):
    DEBUG   = True
    TESTING = False


class TestingConfig(BaseConfig):
    DEBUG   = False
    TESTING = True
    DATABASE_URL = "sqlite:///wolfie_test.db"


class ProductionConfig(BaseConfig):
    DEBUG   = False
    TESTING = False

    # Force SSL in production
    SESSION_COOKIE_SECURE   = True
    REMEMBER_COOKIE_SECURE  = True
    SESSION_COOKIE_HTTPONLY = True


config_map = {
    "development": DevelopmentConfig,
    "testing":     TestingConfig,
    "production":  ProductionConfig,
    "default":     DevelopmentConfig,
}
