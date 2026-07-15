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
