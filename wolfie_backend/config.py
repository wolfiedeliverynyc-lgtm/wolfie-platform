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

    # Production checks
    if os.getenv("FLASK_ENV") == "production":
        if SECRET_KEY == "wolfie-change-in-prod":
            raise ValueError("FATAL: SECRET_KEY must be changed in production")
        if JWT_SECRET_KEY == "wolfie-jwt-change-in-prod":
            raise ValueError("FATAL: JWT_SECRET_KEY must be changed in production")
        # Ensure AI encryption key is changed in production config
        _AI_KEY = os.getenv("AI_ENCRYPTION_KEY", "wolfie-default-encryption-key-32b!")
        if _AI_KEY == "wolfie-default-encryption-key-32b!" or not _AI_KEY:
            raise ValueError("FATAL: AI_ENCRYPTION_KEY must be configured and changed in production")
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

    # ── Database Pool Settings ────────────────
    SQLALCHEMY_POOL_SIZE     = int(os.getenv("SQLALCHEMY_POOL_SIZE", "5"))
    SQLALCHEMY_MAX_OVERFLOW  = int(os.getenv("SQLALCHEMY_MAX_OVERFLOW", "10"))
    SQLALCHEMY_POOL_TIMEOUT  = int(os.getenv("SQLALCHEMY_POOL_TIMEOUT", "30"))
    SQLALCHEMY_POOL_RECYCLE  = int(os.getenv("SQLALCHEMY_POOL_RECYCLE", "1800"))
    SQLALCHEMY_SLOW_QUERY_THRESHOLD = float(os.getenv("SQLALCHEMY_SLOW_QUERY_THRESHOLD", "0.5"))

    # ── Wolfie Business Rules ────────────────
    BASE_DELIVERY_FEE       = float(os.getenv("BASE_DELIVERY_FEE",    "4.00"))
    DELIVERY_FEE_PER_KM     = float(os.getenv("DELIVERY_FEE_PER_KM",  "0.80"))
    DELIVERY_FEE_PER_MIN    = float(os.getenv("DELIVERY_FEE_PER_MIN", "0.12"))
    SERVICE_FEE_RATE        = float(os.getenv("SERVICE_FEE_RATE",      "0.12"))
    SERVICE_FEE_MIN         = float(os.getenv("SERVICE_FEE_MIN",       "3.49"))
    SERVICE_FEE_MAX         = float(os.getenv("SERVICE_FEE_MAX",       "7.49"))
    DRIVER_SUBSCRIPTION_FEE = float(os.getenv("DRIVER_SUBSCRIPTION_FEE", "30.00"))
    TRIAL_DAYS              = int(os.getenv("TRIAL_DAYS", "7"))
    MATCHING_TOP_CANDIDATES = int(os.getenv("MATCHING_TOP_CANDIDATES", "15"))
    MATCHING_FALLBACK_ON_ERROR = os.getenv("MATCHING_FALLBACK_ON_ERROR", "true").lower() in ("true", "1", "yes")

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
    ALLOWED_ORIGINS = [
        o.strip() for o in os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:3000,http://localhost:5173,https://wolfiedelivery.com,https://wolfie-customer-wolfiedeliverynyc-8378s-projects.vercel.app,https://wolfie-restaurant-wolfiedeliverynyc-8378s-projects.vercel.app,https://wolfie-admin-wolfiedeliverynyc-8378s-projects.vercel.app,https://wolfie-driver-new-wolfiedeliverynyc-8378s-projects.vercel.app,https://wolfie-customer.vercel.app,https://wolfie-restaurant.vercel.app,https://wolfie-admin.vercel.app,https://wolfie-driver-new.vercel.app"
        ).split(",") if o.strip()
    ]

    # ── Misc ──────────────────────────────────
    MAX_CONTENT_LENGTH   = 16 * 1024 * 1024   # 16 MB upload limit
    PROPAGATE_EXCEPTIONS = True
    OPENWEATHER_API_KEY  = os.getenv("OPENWEATHER_API_KEY")

    # ── AI Support ────────────────────────────
    GEMINI_API_KEY          = os.getenv("GEMINI_API_KEY")
    AI_ENCRYPTION_KEY       = os.getenv("AI_ENCRYPTION_KEY", "wolfie-default-encryption-key-32b!")
    AI_SUPPORT_RATE_LIMIT   = int(os.getenv("AI_SUPPORT_RATE_LIMIT", "30"))
    AI_SUPPORT_SESSION_TTL  = int(os.getenv("AI_SUPPORT_SESSION_TTL", "7200"))
    AI_SUPPORT_MAX_HISTORY  = int(os.getenv("AI_SUPPORT_MAX_HISTORY", "5"))
    AI_SUPPORT_DAILY_BUDGET = float(os.getenv("AI_SUPPORT_DAILY_BUDGET", "10.00"))



class DevelopmentConfig(BaseConfig):
    ENV     = "development"
    DEBUG   = True
    TESTING = False


class TestingConfig(BaseConfig):
    ENV     = "testing"
    DEBUG   = False
    TESTING = True
    DATABASE_URL = "sqlite:///wolfie_test.db"


class ProductionConfig(BaseConfig):
    ENV     = "production"
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
