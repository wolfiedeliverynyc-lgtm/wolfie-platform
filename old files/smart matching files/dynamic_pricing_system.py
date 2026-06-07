from datetime import datetime
from math import radians, sin, cos, sqrt, atan2
import requests
from enum import Enum

class WeatherCondition(Enum):
    CLEAR = 1.0
    CLOUDY = 1.0
    RAINY = 1.3
    SNOWY = 1.5
    FOGGY = 1.2

class PeakHour(Enum):
    """Peak hours في نيويورك"""
    MORNING_PEAK = {"hours": range(7, 10), "multiplier": 1.3}      # 7-10 صباح
    LUNCH_PEAK = {"hours": range(11, 14), "multiplier": 1.4}       # 11 صباح - 2 مساء
    EVENING_PEAK = {"hours": range(17, 21), "multiplier": 1.5}     # 5-9 مساء
    NIGHT = {"hours": range(21, 24), "multiplier": 1.2}            # 9 مساء - 12 منتصف
    MIDNIGHT = {"hours": range(0, 6), "multiplier": 1.4}           # 12-6 صباح (وجبات الليل)
    OFF_PEAK = {"hours": range(6, 7), "multiplier": 0.8}           # 6-7 صباح (ساعات منخفضة)

class DynamicPricingEngine:
    """
    محرك التسعير الديناميكي لـ Wolfie Delivery
    """
    
    def __init__(self):
        # الأسعار الأساسية
        self.BASE_PRICE = 2.50  # دولار للطلب الأساسي
        self.PRICE_PER_KM = 0.80  # دولار لكل كيلومتر
        self.MINIMUM_PRICE = 3.00  # الحد الأدنى للسعر
        
        # معاملات التأثير
        self.SURGE_THRESHOLD = 3.0  # نسبة الطلب/السائقين
        
    def calculate_distance(self, lat1, lon1, lat2, lon2):
        """
        حساب المسافة بين نقطتين باستخدام Haversine formula
        """
        R = 6371  # نصف قطر الأرض بالكيلومترات
        
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return R * c
    
    def get_time_multiplier(self, current_time=None):
        """
        احسب معامل الوقت بناءً على وقت الذروة
        """
        if current_time is None:
            current_time = datetime.now()
        
        hour = current_time.hour
        
        # تحديد معامل الذروة
        for peak_hour in PeakHour:
            if hour in peak_hour.value["hours"]:
                return peak_hour.value["multiplier"]
        
        return 1.0  # لا يوجد ذروة
    
    def get_demand_multiplier(self, active_orders, available_drivers):
        """
        احسب معامل الطلب والعرض (Surge Pricing)
        
        الفكرة: لو عدد الطلبات كتير وعدد السائقين قليل = سعر أعلى
        """
        if available_drivers == 0:
            return 2.0  # أقصى سعر لو مافيش سائقين
        
        demand_ratio = active_orders / available_drivers
        
        if demand_ratio < 1.0:
            return 0.9  # تخفيض 10% لو فيه سائقين كتير
        elif demand_ratio < 2.0:
            return 1.0  # سعر عادي
        elif demand_ratio < 3.0:
            return 1.3  # 30% زيادة
        elif demand_ratio < 5.0:
            return 1.6  # 60% زيادة
        else:
            return 2.0  # 100% زيادة (أقصى حد)
    
    def get_weather_multiplier(self, weather_condition):
        """
        احسب معامل الطقس
        """
        return weather_condition.value
    
    def get_location_multiplier(self, delivery_area):
        """
        معاملات حسب المنطقة في نيويورك
        """
        area_multipliers = {
            "manhattan": 1.2,      # وسط المدينة - صعب التوصيل
            "brooklyn": 1.0,       # عادي
            "queens": 0.95,        # أرخص شوية
            "bronx": 0.9,          # أرخص
            "staten_island": 1.1,  # بعيد شوية
        }
        return area_multipliers.get(delivery_area.lower(), 1.0)
    
    def calculate_final_price(self, 
                            pickup_lat, pickup_lon, 
                            delivery_lat, delivery_lon,
                            active_orders=10,
                            available_drivers=5,
                            weather_condition=WeatherCondition.CLEAR,
                            delivery_area="brooklyn",
                            current_time=None,
                            special_offer=1.0):
        """
        احسب السعر النهائي مع كل العوامل
        """
        
        # 1️⃣ احسب المسافة
        distance = self.calculate_distance(
            pickup_lat, pickup_lon,
            delivery_lat, delivery_lon
        )
        
        # 2️⃣ السعر الأساسي
        base_price = self.BASE_PRICE + (distance * self.PRICE_PER_KM)
        
        # 3️⃣ معاملات الضرب
        time_mult = self.get_time_multiplier(current_time)
        demand_mult = self.get_demand_multiplier(active_orders, available_drivers)
        weather_mult = self.get_weather_multiplier(weather_condition)
        location_mult = self.get_location_multiplier(delivery_area)
        
        # 4️⃣ السعر النهائي
        final_price = base_price * time_mult * demand_mult * weather_mult * location_mult * special_offer
        
        # 5️⃣ تأكد من الحد الأدنى والأقصى
        final_price = max(final_price, self.MINIMUM_PRICE)
        final_price = min(final_price, base_price * 2.5)  # لا تتجاوز 250%
        
        return {
            "distance_km": round(distance, 2),
            "base_price": round(base_price, 2),
            "time_multiplier": time_mult,
            "demand_multiplier": round(demand_mult, 2),
            "weather_multiplier": weather_mult,
            "location_multiplier": location_mult,
            "special_offer": special_offer,
            "final_price": round(final_price, 2),
            "estimated_delivery_time_minutes": int(distance * 3) + 5,  # تقدير تقريبي
        }

# ============ EXAMPLES ============

if __name__ == "__main__":
    pricing = DynamicPricingEngine()
    
    # مثال 1: طلب عادي في وقت عادي
    print("=" * 60)
    print("📍 مثال 1: طلب عادي")
    print("=" * 60)
    result = pricing.calculate_final_price(
        pickup_lat=40.7128,      # Manhattan
        pickup_lon=-74.0060,
        delivery_lat=40.6782,    # Brooklyn
        delivery_lon=-73.9442,
        active_orders=5,
        available_drivers=10,
        weather_condition=WeatherCondition.CLEAR,
        delivery_area="brooklyn"
    )
    for key, value in result.items():
        print(f"{key}: {value}")
    
    # مثال 2: طلب في وقت الذروة مع طقس سيء
    print("\n" + "=" * 60)
    print("📍 مثال 2: وقت الذروة + مطر")
    print("=" * 60)
    peak_time = datetime(2024, 1, 15, 18, 30)  # 6:30 مساء
    result = pricing.calculate_final_price(
        pickup_lat=40.7128,
        pickup_lon=-74.0060,
        delivery_lat=40.6782,
        delivery_lon=-73.9442,
        active_orders=25,        # كتير الطلبات
        available_drivers=8,     # وسائقين قليل
        weather_condition=WeatherCondition.RAINY,
        delivery_area="manhattan",
        current_time=peak_time
    )
    for key, value in result.items():
        print(f"{key}: {value}")
    
    # مثال 3: وقت الليل مع surge pricing عالي
    print("\n" + "=" * 60)
    print("📍 مثال 3: وقت الليل + Surge pricing")
    print("=" * 60)
    night_time = datetime(2024, 1, 15, 23, 45)  # 11:45 ليلاً
    result = pricing.calculate_final_price(
        pickup_lat=40.7128,
        pickup_lon=-74.0060,
        delivery_lat=40.6782,
        delivery_lon=-73.9442,
        active_orders=50,        # هجوم من الطلبات
        available_drivers=3,     # سائقين قليل جداً
        weather_condition=WeatherCondition.SNOWY,
        delivery_area="manhattan",
        current_time=night_time,
        special_offer=0.95       # كوبون 5% خصم
    )
    for key, value in result.items():
        print(f"{key}: {value}")
