"""
╔══════════════════════════════════════════════════════════════╗
║  WOLFIE DELIVERY — integrated_pricing_engine.py              ║
║  Pricing v5.7 — Compatible with app.py + routes/orders.py   ║
║                                                              ║
║  Interface expected by app.py:                               ║
║      WolfiePricingEngine(config)                             ║
║      .calculate(subtotal, distance_km, duration_min,         ║
║                 restaurant_id, customer_id,                  ║
║                 is_surge, weather_code, promo_code)          ║
╚══════════════════════════════════════════════════════════════╝
"""

import logging
from datetime import datetime, timezone

logger = logging.getLogger("wolfie")
UTC    = timezone.utc


class WolfiePricingEngine:

    # Commission tiers: (min_monthly_orders, rate)
    COMMISSION_TIERS = [
        (200, 0.10),
        (100, 0.12),
        (50,  0.15),
        (0,   0.18),
    ]

    # Promo codes (hardcoded for MVP — move to DB later)
    PROMO_CODES = {
        "WOLF10":  {"type": "percent", "value": 0.10},
        "FIRST5":  {"type": "flat",    "value": 5.00},
        "WOLF20":  {"type": "percent", "value": 0.20},
    }

    # Weather multipliers
    WEATHER_MULTIPLIERS = {
        "rain":  1.25,
        "snow":  1.50,
        "storm": 1.75,
    }

    def __init__(self, config: dict):
        cfg = config or {}
        self.base_delivery      = float(cfg.get("BASE_DELIVERY_FEE",       4.00))
        self.fee_per_km         = float(cfg.get("DELIVERY_FEE_PER_KM",     0.80))
        self.fee_per_min        = float(cfg.get("DELIVERY_FEE_PER_MIN",    0.12))
        self.service_rate       = float(cfg.get("SERVICE_FEE_RATE",        0.12))
        self.service_min        = float(cfg.get("SERVICE_FEE_MIN",         3.49))
        self.service_max        = float(cfg.get("SERVICE_FEE_MAX",         7.49))
        self.surge_max          = float(cfg.get("SURGE_MULTIPLIER_MAX",    2.50))
        self.delivery_fee_min   = 4.49
        self.delivery_fee_max   = 12.49
        self.profit_floor       = 1.50   # min platform profit per order
        logger.info("WolfiePricingEngine v5.7 initialized")

    def calculate(self,
                  subtotal:      float,
                  distance_km:   float  = 2.0,
                  duration_min:  float  = 15.0,
                  restaurant_id: str    = None,
                  customer_id:   str    = None,
                  is_surge:      bool   = False,
                  weather_code:  str    = None,
                  promo_code:    str    = None) -> dict:
        """
        Full v5.7 pricing calculation.
        Returns all fee components + breakdown.
        """

        # ── 1. Delivery fee ───────────────────
        delivery_fee = self.base_delivery + (self.fee_per_km * distance_km) + (self.fee_per_min * duration_min)
        delivery_fee = round(delivery_fee, 2)

        # ── 2. Weather multiplier ─────────────
        weather_mult = 1.0
        if weather_code:
            weather_mult = self.WEATHER_MULTIPLIERS.get(weather_code.lower(), 1.0)
            delivery_fee = round(delivery_fee * weather_mult, 2)

        # ── 3. Surge pricing ──────────────────
        surge_mult = 1.0
        if is_surge:
            surge_mult   = min(self._get_surge_multiplier(), self.surge_max)
            delivery_fee = round(delivery_fee * surge_mult, 2)

        # ── 4. Cap delivery fee ───────────────
        delivery_fee = max(self.delivery_fee_min, min(delivery_fee, self.delivery_fee_max))

        # ── 5. Service fee ────────────────────
        service_fee = round(subtotal * self.service_rate, 2)
        service_fee = max(self.service_min, min(service_fee, self.service_max))

        # 🧾 6. Tax (NYC 8.875%) 🧾🧾🧾🧾🧾🧾🧾
        tax = round(subtotal * 0.08875, 2)

        # 🏎 7. Driver payout 🏎🏎🏎🏎🏎🏎🏎🏎🏎
        driver_payout = round(
            self.base_delivery + (self.fee_per_km * distance_km) + (self.fee_per_min * duration_min),
            2
        )
        if weather_mult > 1.0:
            driver_payout = round(driver_payout * 1.10, 2)   # driver gets 10% weather bonus
            
        driver_payout = round(max(0.0, driver_payout - 0.30), 2)

        # ── 8. Restaurant commission ──────────
        monthly_orders     = self._get_restaurant_monthly_orders(restaurant_id)
        commission_rate    = self._get_commission_rate(monthly_orders)
        restaurant_commission = round(subtotal * commission_rate, 2)

        # ── 9. Promo / discount ───────────────
        discount     = 0.0
        promo_applied = None
        if promo_code:
            promo = self.PROMO_CODES.get(promo_code.upper())
            if promo:
                if promo["type"] == "percent":
                    discount = round(subtotal * promo["value"], 2)
                else:
                    discount = min(promo["value"], subtotal)
                promo_applied = promo_code.upper()

        # ── 10. Total ─────────────────────────
        total = round(subtotal + delivery_fee + service_fee + tax - discount, 2)
        total = max(total, 1.00)   # never negative

        # ── 11. Platform profit check ─────────
        platform_profit = round(delivery_fee + service_fee - driver_payout + restaurant_commission, 2)
        if platform_profit < self.profit_floor:
            # Adjust service fee up slightly to meet floor
            gap          = self.profit_floor - platform_profit
            service_fee  = round(min(service_fee + gap, self.service_max), 2)
            total        = round(total + gap, 2)
            platform_profit = self.profit_floor

        return {
            "subtotal":               round(subtotal, 2),
            "delivery_fee":           delivery_fee,
            "service_fee":            service_fee,
            "tax":                    tax,
            "discount":               discount,
            "total":                  total,
            "driver_payout":          driver_payout,
            "restaurant_commission":  restaurant_commission,
            "commission_rate":        commission_rate,
            "platform_profit":        platform_profit,
            "surge_applied":          is_surge,
            "surge_multiplier":       surge_mult,
            "weather_multiplier":     weather_mult,
            "promo_applied":          promo_applied,
            "distance_km":            round(distance_km, 2),
            "duration_min":           round(duration_min, 1),
            "source":                 "v5.7",
        }

    # ── Helpers ───────────────────────────────

    def _get_commission_rate(self, monthly_orders: int) -> float:
        for threshold, rate in self.COMMISSION_TIERS:
            if monthly_orders >= threshold:
                return rate
        return 0.18

    def _get_restaurant_monthly_orders(self, restaurant_id: str) -> int:
        """Try to get real count from DB, fallback to 0."""
        if not restaurant_id:
            return 0
        try:
            from flask import current_app
            db = getattr(current_app, "db", None)
            if not db:
                return 0
            res = (
                db.table("orders")
                .select("id", count="exact")
                .eq("restaurant_id", restaurant_id)
                .eq("status", "delivered")
                .execute()
            )
            return res.count or 0
        except Exception:
            return 0

    def _get_surge_multiplier(self) -> float:
        """
        Real surge: count active orders in last 30 min.
        Simple linear ramp: 10 orders → 1.2x, 30 orders → 1.8x, 50+ → 2.5x
        """
        try:
            from flask import current_app
            db = getattr(current_app, "db", None)
            if not db:
                return 1.3
            from datetime import timedelta
            since = (datetime.now(UTC) - timedelta(minutes=30)).isoformat()
            res   = (
                db.table("orders")
                .select("id", count="exact")
                .gte("created_at", since)
                .execute()
            )
            active = res.count or 0
            if active >= 50:
                return self.surge_max
            elif active >= 30:
                return 1.8
            elif active >= 10:
                return 1.4
            else:
                return 1.2
        except Exception:
            return 1.3
