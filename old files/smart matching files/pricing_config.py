# pricing_config.py
# ============================================
# Wolfie Delivery - Dynamic Pricing Configuration
# ============================================

from datetime import datetime
from enum import Enum

# ============ BASIC PRICING ============
BASE_PRICE = 2.50              # السعر الأساسي للطلب
PRICE_PER_KM = 0.80            # سعر الكيلومتر الواحد
MINIMUM_PRICE = 3.00           # الحد الأدنى للسعر
MAXIMUM_MULTIPLIER = 2.5       # الحد الأقصى للمضروب (250%)

# ============ PEAK HOURS ============
PEAK_HOURS_CONFIG = {
    'MORNING_PEAK': {
        'hours': range(7, 10),              # 7:00 - 10:00 صباحاً
        'multiplier': 1.3,
        'description': 'Morning rush hour'
    },
    'LUNCH_PEAK': {
        'hours': range(11, 14),             # 11:00 - 14:00
        'multiplier': 1.4,
        'description': 'Lunch time'
    },
    'EVENING_PEAK': {
        'hours': range(17, 21),             # 17:00 - 21:00 (5 PM - 9 PM)
        'multiplier': 1.5,
        'description': 'Evening rush hour'
    },
    'NIGHT_SERVICE': {
        'hours': range(21, 24),             # 21:00 - 00:00 (9 PM - Midnight)
        'multiplier': 1.2,
        'description': 'Night service'
    },
    'MIDNIGHT_EATS': {
        'hours': range(0, 6),               # 00:00 - 06:00 (Late night snacks)
        'multiplier': 1.4,
        'description': 'Late night orders'
    },
    'OFF_PEAK': {
        'hours': range(6, 7),               # 06:00 - 07:00 (Super early morning)
        'multiplier': 0.8,
        'description': 'Low demand hours'
    }
}

# ============ DEMAND MULTIPLIERS ============
# بناءً على نسبة الطلب/السائقين
DEMAND_MULTIPLIERS = {
    'LOW': {
        'ratio_range': (0.0, 1.0),
        'multiplier': 0.9,
        'description': 'Few orders, many drivers'
    },
    'NORMAL': {
        'ratio_range': (1.0, 2.0),
        'multiplier': 1.0,
        'description': 'Normal demand'
    },
    'HIGH': {
        'ratio_range': (2.0, 3.0),
        'multiplier': 1.3,
        'description': 'High demand'
    },
    'VERY_HIGH': {
        'ratio_range': (3.0, 5.0),
        'multiplier': 1.6,
        'description': 'Very high demand (Surge)'
    },
    'CRITICAL': {
        'ratio_range': (5.0, float('inf')),
        'multiplier': 2.0,
        'description': 'Critical shortage (Max surge)'
    }
}

# ============ WEATHER CONDITIONS ============
WEATHER_MULTIPLIERS = {
    'CLEAR': 1.0,           # صافي
    'CLOUDY': 1.0,          # غائم
    'RAINY': 1.3,           # مطر (30% زيادة)
    'SNOWY': 1.5,           # ثلج (50% زيادة)
    'FOGGY': 1.2,           # ضباب (20% زيادة)
    'THUNDERSTORM': 1.6,    # عاصفة رعدية (60% زيادة)
    'EXTREME_COLD': 1.4,    # برد شديد (40% زيادة)
}

# ============ LOCATION MULTIPLIERS ============
# معاملات حسب المنطقة في نيويورك
LOCATION_MULTIPLIERS = {
    'manhattan': {
        'multiplier': 1.2,
        'reason': 'Dense area, high demand, congestion'
    },
    'brooklyn': {
        'multiplier': 1.0,
        'reason': 'Standard rate'
    },
    'queens': {
        'multiplier': 0.95,
        'reason': 'Slightly less demand'
    },
    'bronx': {
        'multiplier': 0.9,
        'reason': 'Lower demand, longer distances'
    },
    'staten_island': {
        'multiplier': 1.1,
        'reason': 'Remote area, ferry crossing'
    }
}

# ============ COUPONS & PROMOS ============
COUPONS = {
    'WOLFIE20': {
        'discount_percentage': 20,
        'max_usage': 1000,
        'min_order_value': 10.00,
        'valid_from': '2024-01-01',
        'valid_until': '2024-12-31',
        'description': 'Welcome 20% off'
    },
    'WELCOME10': {
        'discount_percentage': 10,
        'max_usage': -1,  # unlimited
        'min_order_value': 0,
        'valid_from': '2024-01-01',
        'valid_until': '2025-12-31',
        'description': 'New user 10% off'
    },
    'FREEDELIV': {
        'discount_percentage': 100,  # Free delivery (50% of base price)
        'max_usage': 100,
        'min_order_value': 25.00,
        'valid_from': '2024-06-01',
        'valid_until': '2024-06-30',
        'description': 'Free delivery promo'
    },
    'NYC30': {
        'discount_percentage': 30,
        'max_usage': 2000,
        'min_order_value': 20.00,
        'valid_from': '2024-03-01',
        'valid_until': '2024-03-31',
        'description': 'NYC Anniversary 30% off'
    },
    'STUDENT15': {
        'discount_percentage': 15,
        'max_usage': -1,
        'min_order_value': 0,
        'valid_from': '2024-01-01',
        'valid_until': '2025-12-31',
        'description': 'Student discount (requires verification)'
    }
}

# ============ SURGE PRICING THRESHOLDS ============
SURGE_CONFIG = {
    'enabled': True,
    'min_threshold_ratio': 2.0,  # ابدأ surge عندما تكون النسبة >= 2.0
    'max_surge_multiplier': 2.0,  # الحد الأقصى للـ surge
    'trigger_count': 10,          # عدد الطلبات المطلوبة لتفعيل surge
    'cooldown_minutes': 15,       # فترة الانتظار قبل العودة للتسعير العادي
}

# ============ PERFORMANCE SETTINGS ============
PERFORMANCE = {
    'cache_enabled': True,
    'cache_duration_seconds': 60,  # احفظ نتائج الحسابات لمدة دقيقة
    'max_calculation_time_ms': 100,  # أقصى وقت للحساب
    'batch_size': 100,             # معالج الطلبات على دفعات
}

# ============ ANALYTICS & REPORTING ============
ANALYTICS = {
    'log_all_transactions': True,
    'log_surge_events': True,
    'daily_report_enabled': True,
    'hourly_report_enabled': True,
    'export_format': 'json',  # csv, json, excel
    'retention_days': 365,  # احفظ البيانات لمدة سنة واحدة
}

# ============ NOTIFICATION SETTINGS ============
NOTIFICATIONS = {
    'notify_on_surge': True,
    'surge_threshold_multiplier': 1.5,  # تنبيه عندما يصل إلى 1.5x
    'notify_restaurants': True,
    'notify_drivers': True,
    'notify_admin': True,
}

# ============ DATABASE SETTINGS ============
DATABASE = {
    'host': 'localhost',
    'port': 3306,
    'username': 'wolfie_user',
    'password': 'secure_password',
    'database': 'wolfie_delivery',
    'charset': 'utf8mb4',
    'pool_size': 20,
    'max_overflow': 40,
    'pool_recycle': 3600,
}

# ============ API SETTINGS ============
API = {
    'base_url': 'http://localhost:5000/api/pricing',
    'timeout_seconds': 5,
    'retry_attempts': 3,
    'rate_limit': {
        'enabled': True,
        'requests_per_minute': 60,
        'requests_per_hour': 1000,
    }
}

# ============ FEATURE FLAGS ============
FEATURES = {
    'dynamic_pricing': True,
    'surge_pricing': True,
    'weather_impact': True,
    'location_multipliers': True,
    'coupon_support': True,
    'real_time_updates': True,
    'analytics_dashboard': True,
    'bulk_pricing': True,  # احسب أسعار متعددة في طلب واحد
    'price_prediction': False,  # قريباً
    'machine_learning': False,  # قريباً
}

# ============ CUSTOM RULES ============
# قواعس تسعير مخصصة
CUSTOM_RULES = [
    {
        'name': 'Large Order Discount',
        'type': 'order_amount',
        'min_amount': 100,
        'discount_percentage': 5,
        'enabled': True
    },
    {
        'name': 'Frequent Customer Loyalty',
        'type': 'customer_loyalty',
        'min_orders': 10,
        'discount_percentage': 10,
        'enabled': True
    },
    {
        'name': 'Partner Restaurant Premium',
        'type': 'restaurant_tier',
        'tier': 'PREMIUM',
        'multiplier': 1.1,  # قسط إضافي
        'enabled': True
    },
    {
        'name': 'Evening Bulk Orders',
        'type': 'time_based',
        'hours': range(17, 21),
        'min_orders': 3,
        'discount_percentage': 7,
        'enabled': True
    }
]

# ============ THRESHOLDS & LIMITS ============
THRESHOLDS = {
    'min_order_value': 0.00,
    'max_order_value': 999.99,
    'min_distance_km': 0.1,
    'max_distance_km': 50.0,
    'avg_delivery_speed_kmh': 20,  # للحساب الافتراضي
    'average_stops_per_order': 1.2,  # قد يوصل لأماكن متعددة
}

# ============ TESTING CONFIGURATION ============
TESTING = {
    'enabled': False,
    'use_mock_weather': False,
    'mock_surge_multiplier': 1.0,
    'fixed_random_seed': None,
}

# ============ DEBUG MODE ============
DEBUG = {
    'enabled': False,
    'log_level': 'INFO',  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    'verbose_logging': False,
    'print_calculations': False,
}

# ============ HELPER FUNCTIONS ============

def get_peak_hour_multiplier(hour: int) -> float:
    """احصل على معامل الذروة بناءً على الساعة"""
    for peak_name, config in PEAK_HOURS_CONFIG.items():
        if hour in config['hours']:
            return config['multiplier']
    return 1.0

def get_demand_level_from_ratio(ratio: float) -> str:
    """حدد مستوى الطلب من النسبة"""
    for level_name, config in DEMAND_MULTIPLIERS.items():
        min_ratio, max_ratio = config['ratio_range']
        if min_ratio <= ratio < max_ratio:
            return level_name
    return 'CRITICAL'

def get_coupon_discount(coupon_code: str) -> float:
    """احصل على نسبة الخصم من كود الكوبون"""
    if coupon_code in COUPONS:
        discount_pct = COUPONS[coupon_code]['discount_percentage']
        return 1.0 - (discount_pct / 100)
    return 1.0

def get_location_multiplier(area: str) -> float:
    """احصل على معامل الموقع"""
    return LOCATION_MULTIPLIERS.get(area.lower(), {}).get('multiplier', 1.0)

def get_weather_multiplier(weather: str) -> float:
    """احصل على معامل الطقس"""
    return WEATHER_MULTIPLIERS.get(weather.upper(), 1.0)

# ============ VALIDATION ============

def validate_config():
    """تحقق من صحة الإعدادات"""
    errors = []
    
    # تحقق من الأسعار
    if BASE_PRICE <= 0:
        errors.append("BASE_PRICE must be greater than 0")
    if PRICE_PER_KM <= 0:
        errors.append("PRICE_PER_KM must be greater than 0")
    if MINIMUM_PRICE > BASE_PRICE:
        errors.append("MINIMUM_PRICE cannot be greater than BASE_PRICE")
    
    # تحقق من المعاملات
    if any(m <= 0 for m in DEMAND_MULTIPLIERS.values()):
        errors.append("All multipliers must be greater than 0")
    
    if errors:
        print("⚠️ Configuration Errors:")
        for error in errors:
            print(f"  - {error}")
        return False
    
    print("✅ Configuration is valid")
    return True

# ============ INITIALIZATION ============

if __name__ == '__main__':
    print("🐺 Wolfie Delivery - Dynamic Pricing Configuration")
    print("=" * 50)
    print(f"Base Price: ${BASE_PRICE}")
    print(f"Price per KM: ${PRICE_PER_KM}")
    print(f"Minimum Price: ${MINIMUM_PRICE}")
    print(f"Peak Hours Defined: {len(PEAK_HOURS_CONFIG)}")
    print(f"Coupons Available: {len(COUPONS)}")
    print(f"Locations: {len(LOCATION_MULTIPLIERS)}")
    print("=" * 50)
    
    # تحقق من الصحة
    validate_config()
