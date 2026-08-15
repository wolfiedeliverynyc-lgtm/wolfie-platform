"""
WOLFIE DELIVERY — tests/test_pricing.py
Tests for the Pricing Engine v5.7
"""

import pytest
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


# ── Fallback pricing logic (mirrors routes/orders.py _fallback_pricing) ───────

def fallback_pricing(subtotal: float, distance_km: float = 2.0,
                     duration_min: float = 15.0) -> dict:
    delivery_fee = round(max(4.49, min(4.00 + 0.80 * distance_km + 0.12 * duration_min, 12.49)), 2)
    service_fee  = round(max(3.49, min(subtotal * 0.12, 7.49)), 2)
    return {
        "subtotal":              subtotal,
        "delivery_fee":          delivery_fee,
        "service_fee":           service_fee,
        "restaurant_commission": round(subtotal * 0.15, 2),
        "driver_payout":         round(4.00 + 0.80 * distance_km + 0.12 * duration_min, 2),
        "total":                 round(subtotal + delivery_fee + service_fee, 2),
        "surge_applied":         False,
        "source":                "fallback",
    }


# ══════════════════════════════════════════════════════════════════════════════
# 1 — DELIVERY FEE CALCULATION
# ══════════════════════════════════════════════════════════════════════════════

class TestDeliveryFee:

    def test_minimum_delivery_fee(self):
        """Short orders must never go below $4.49."""
        result = fallback_pricing(subtotal=10.0, distance_km=0.5, duration_min=5.0)
        assert result["delivery_fee"] >= 4.49

    def test_maximum_delivery_fee(self):
        """Long orders must never exceed $12.49."""
        result = fallback_pricing(subtotal=10.0, distance_km=50.0, duration_min=90.0)
        assert result["delivery_fee"] <= 12.49

    def test_fee_increases_with_distance(self):
        short = fallback_pricing(subtotal=20.0, distance_km=1.0, duration_min=10.0)
        long_ = fallback_pricing(subtotal=20.0, distance_km=8.0, duration_min=30.0)
        assert long_["delivery_fee"] > short["delivery_fee"]

    def test_fee_per_km_formula(self):
        """$0.80/km base formula check."""
        result = fallback_pricing(subtotal=20.0, distance_km=3.0, duration_min=0.0)
        raw    = 4.00 + 0.80 * 3.0
        assert result["delivery_fee"] == round(max(4.49, min(raw, 12.49)), 2)

    def test_fee_per_minute_formula(self):
        """$0.12/min base formula check."""
        result = fallback_pricing(subtotal=20.0, distance_km=0.0, duration_min=10.0)
        raw    = 4.00 + 0.12 * 10.0
        assert result["delivery_fee"] == round(max(4.49, min(raw, 12.49)), 2)


# ══════════════════════════════════════════════════════════════════════════════
# 2 — SERVICE FEE
# ══════════════════════════════════════════════════════════════════════════════

class TestServiceFee:

    def test_minimum_service_fee(self):
        """Small orders must never pay less than $3.49."""
        result = fallback_pricing(subtotal=5.0)
        assert result["service_fee"] >= 3.49

    def test_maximum_service_fee(self):
        """Large orders must never pay more than $7.49."""
        result = fallback_pricing(subtotal=200.0)
        assert result["service_fee"] <= 7.49

    def test_service_fee_is_12_percent(self):
        """Mid-range orders pay exactly 12%."""
        subtotal = 40.0   # 12% = $4.80 — within $3.49–$7.49 range
        result   = fallback_pricing(subtotal=subtotal)
        assert result["service_fee"] == round(subtotal * 0.12, 2)

    def test_service_fee_capped_at_max(self):
        result = fallback_pricing(subtotal=100.0)
        assert result["service_fee"] == 7.49

    def test_service_fee_floored_at_min(self):
        result = fallback_pricing(subtotal=1.0)
        assert result["service_fee"] == 3.49


# ══════════════════════════════════════════════════════════════════════════════
# 3 — DRIVER PAYOUT
# ══════════════════════════════════════════════════════════════════════════════

class TestDriverPayout:

    def test_driver_payout_formula(self):
        """$4.00 + $0.80/km + $0.12/min."""
        d, t   = 3.0, 10.0
        result = fallback_pricing(subtotal=20.0, distance_km=d, duration_min=t)
        expected = round(4.00 + 0.80 * d + 0.12 * t, 2)
        assert result["driver_payout"] == expected

    def test_driver_payout_minimum(self):
        """Even very short orders pay at least $4.00."""
        result = fallback_pricing(subtotal=10.0, distance_km=0.0, duration_min=0.0)
        assert result["driver_payout"] >= 4.00

    def test_driver_payout_increases_with_distance(self):
        near = fallback_pricing(20.0, distance_km=1.0, duration_min=10.0)
        far  = fallback_pricing(20.0, distance_km=8.0, duration_min=30.0)
        assert far["driver_payout"] > near["driver_payout"]


# ══════════════════════════════════════════════════════════════════════════════
# 4 — RESTAURANT COMMISSION
# ══════════════════════════════════════════════════════════════════════════════

class TestRestaurantCommission:

    def test_default_commission_is_15_percent(self):
        subtotal = 50.0
        result   = fallback_pricing(subtotal=subtotal)
        assert result["restaurant_commission"] == round(subtotal * 0.15, 2)

    def test_commission_scales_with_order(self):
        small = fallback_pricing(subtotal=10.0)
        large = fallback_pricing(subtotal=100.0)
        assert large["restaurant_commission"] > small["restaurant_commission"]

    def test_commission_within_wolfie_range(self):
        """Wolfie commission must always be 10–18%."""
        for subtotal in [10.0, 25.0, 50.0, 100.0]:
            result = fallback_pricing(subtotal=subtotal)
            rate   = result["restaurant_commission"] / subtotal
            assert 0.10 <= rate <= 0.18, f"Commission rate {rate:.2%} out of range for ${subtotal}"


# ══════════════════════════════════════════════════════════════════════════════
# 5 — TOTAL & PROFIT FLOOR
# ══════════════════════════════════════════════════════════════════════════════

class TestTotal:

    def test_total_is_sum_of_parts(self):
        result = fallback_pricing(subtotal=30.0, distance_km=3.0, duration_min=15.0)
        expected = round(result["subtotal"] + result["delivery_fee"] + result["service_fee"], 2)
        assert result["total"] == expected

    def test_total_always_positive(self):
        for subtotal in [0.01, 5.0, 10.0, 50.0, 100.0]:
            result = fallback_pricing(subtotal=subtotal)
            assert result["total"] > 0

    def test_platform_always_profitable(self):
        """
        Platform revenue = service_fee.
        Must always be >= $3.49 (minimum service fee).
        """
        for subtotal in [5.0, 10.0, 25.0, 100.0]:
            result = fallback_pricing(subtotal=subtotal)
            assert result["service_fee"] >= 3.49, f"Platform not profitable on ${subtotal} order"

    def test_driver_always_profitable(self):
        """Driver payout always >= $4.00."""
        for d, t in [(0, 0), (1, 5), (3, 15), (10, 40)]:
            result = fallback_pricing(10.0, distance_km=d, duration_min=t)
            assert result["driver_payout"] >= 4.00

    @pytest.mark.parametrize("subtotal,distance,duration", [
        (12.99, 2.0, 15.0),   # typical burger
        (8.50,  1.5, 10.0),   # small order
        (45.00, 5.0, 25.0),   # large order
        (100.0, 8.0, 40.0),   # group order
    ])
    def test_realistic_orders(self, subtotal, distance, duration):
        result = fallback_pricing(subtotal, distance, duration)
        assert result["total"] > subtotal          # customer pays more than food cost
        assert result["driver_payout"] >= 4.00     # driver always gets paid
        assert result["service_fee"] >= 3.49       # platform always earns
        assert result["delivery_fee"] >= 4.49      # delivery fee in range
        assert result["delivery_fee"] <= 12.49


# ══════════════════════════════════════════════════════════════════════════════
# 6 — WOLFIE PRICING ENGINE DATABASE INTEGRATION TESTS
# ══════════════════════════════════════════════════════════════════════════════

class TestWolfiePricingEngineDatabase:

    def test_pricing_engine_commission_tiers_with_sqlalchemy(self, app):
        """Verify dynamic commission rate based on delivered monthly orders in DB."""
        import uuid
        from datetime import datetime, timezone, timedelta
        from database.session import transaction
        from database.schemas import User, Order
        from services.pricing import WolfiePricingEngine

        engine = WolfiePricingEngine({})
        rest_id = f"rest_tier_{uuid.uuid4().hex[:8]}"
        cust_id = f"cust_tier_{uuid.uuid4().hex[:8]}"

        with app.app_context():
            with transaction() as session:
                rest_user = User(
                    id=rest_id,
                    email=f"{rest_id}@test.com",
                    password_hash="fakehash",
                    full_name="Tier Restaurant",
                    phone="5550001",
                    role="restaurant",
                    is_active=True,
                )
                cust_user = User(
                    id=cust_id,
                    email=f"{cust_id}@test.com",
                    password_hash="fakehash",
                    full_name="Tier Customer",
                    phone="5550002",
                    role="customer",
                    is_active=True,
                )
                session.add(rest_user)
                session.add(cust_user)

            # 0 orders -> 18% tier
            count_0 = engine._get_restaurant_monthly_orders(rest_id)
            assert count_0 == 0
            assert engine._get_commission_rate(count_0) == 0.18

            # Seed 55 delivered orders -> 15% tier
            now = datetime.now(timezone.utc)
            with transaction() as session:
                for i in range(55):
                    session.add(Order(
                        id=str(uuid.uuid4()),
                        customer_id=cust_id,
                        restaurant_id=rest_id,
                        status="delivered",
                        pickup_address="123 St",
                        delivery_address="456 Ave",
                        items=[{"name": "Burger", "price": 10.0}],
                        subtotal=10.0,
                        total=15.0,
                        payment_method="card",
                        created_at=now - timedelta(days=5),
                        delivered_at=now - timedelta(days=5),
                    ))

            count_55 = engine._get_restaurant_monthly_orders(rest_id)
            assert count_55 == 55
            assert engine._get_commission_rate(count_55) == 0.15

            # Calculate price quote for this restaurant -> commission should be 15%
            quote = engine.calculate(subtotal=100.0, distance_km=2.0, duration_min=15.0, restaurant_id=rest_id)
            assert quote["commission_rate"] == 0.15
            assert quote["restaurant_commission"] == 15.0

    def test_pricing_engine_surge_multiplier_with_sqlalchemy(self, app):
        """Verify dynamic surge pricing based on active orders in the last 30 minutes."""
        import uuid
        from datetime import datetime, timezone, timedelta
        from database.session import transaction
        from database.schemas import User, Order
        from services.pricing import WolfiePricingEngine

        engine = WolfiePricingEngine({"SURGE_MULTIPLIER_MAX": 2.50})
        cust_id = f"cust_surge_{uuid.uuid4().hex[:8]}"
        rest_id = f"rest_surge_{uuid.uuid4().hex[:8]}"

        with app.app_context():
            with transaction() as session:
                session.add(User(
                    id=rest_id, email=f"{rest_id}@test.com",
                    password_hash="fakehash", full_name="Surge Rest",
                    phone="5550003", role="restaurant", is_active=True,
                ))
                session.add(User(
                    id=cust_id, email=f"{cust_id}@test.com",
                    password_hash="fakehash", full_name="Surge Cust",
                    phone="5550004", role="customer", is_active=True,
                ))

            # Seed 12 active orders in last 30 minutes -> surge 1.4x (>=10 orders)
            now = datetime.now(timezone.utc)
            with transaction() as session:
                session.query(Order).filter(Order.created_at >= now - timedelta(minutes=30)).delete()
                for _ in range(12):
                    session.add(Order(
                        id=str(uuid.uuid4()),
                        customer_id=cust_id,
                        restaurant_id=rest_id,
                        status="pending",
                        pickup_address="123 St",
                        delivery_address="456 Ave",
                        items=[{"name": "Pizza", "price": 20.0}],
                        subtotal=20.0,
                        total=25.0,
                        payment_method="card",
                        created_at=now - timedelta(minutes=5),
                    ))

            surge_mult = engine._get_surge_multiplier()
            assert surge_mult == 1.4

            # Calculate pricing -> verify surge is automatically applied
            quote = engine.calculate(subtotal=50.0, distance_km=3.0, duration_min=10.0)
            assert quote["surge_applied"] is True
            assert quote["surge_multiplier"] == 1.4
            assert quote["delivery_fee"] >= 4.49
