from flask import Blueprint, request, jsonify
from datetime import datetime
from dynamic_pricing_system import DynamicPricingEngine, WeatherCondition
from sqlalchemy import func
import logging

pricing_bp = Blueprint('pricing', __name__, url_prefix='/api/pricing')
pricing_engine = DynamicPricingEngine()

logger = logging.getLogger(__name__)

# ============ DATABASE MODELS ============
# (أضف هذي للـ models.py الموجود)

from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class PricingLog(db.Model):
    """تسجيل كل عملية تسعير"""
    __tablename__ = 'pricing_logs'
    
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, nullable=False)
    base_price = Column(Float, nullable=False)
    final_price = Column(Float, nullable=False)
    distance_km = Column(Float, nullable=False)
    time_multiplier = Column(Float, default=1.0)
    demand_multiplier = Column(Float, default=1.0)
    weather_condition = Column(String(50), default='CLEAR')
    delivery_area = Column(String(50), nullable=False)
    active_orders = Column(Integer, default=0)
    available_drivers = Column(Integer, default=0)
    timestamp = Column(DateTime, default=datetime.utcnow)

class WeatherData(db.Model):
    """بيانات الطقس الحالية لكل منطقة"""
    __tablename__ = 'weather_data'
    
    id = Column(Integer, primary_key=True)
    area = Column(String(50), unique=True, nullable=False)
    condition = Column(String(50), nullable=False)  # CLEAR, RAINY, SNOWY, etc
    temperature = Column(Float)
    last_updated = Column(DateTime, default=datetime.utcnow)

# ============ FLASK ROUTES ============

@pricing_bp.route('/calculate', methods=['POST'])
def calculate_price():
    """
    حساب السعر الديناميكي للطلب
    
    Request JSON:
    {
        "pickup_lat": 40.7128,
        "pickup_lon": -74.0060,
        "delivery_lat": 40.6782,
        "delivery_lon": -73.9442,
        "delivery_area": "brooklyn",
        "restaurant_id": 1,
        "coupon_code": "WOLFIE20"  (اختياري)
    }
    """
    try:
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['pickup_lat', 'pickup_lon', 'delivery_lat', 'delivery_lon', 'delivery_area']
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400
        
        # احصل على عدد الطلبات النشطة والسائقين المتاحين
        active_orders = get_active_orders_count()
        available_drivers = get_available_drivers_count()
        
        # احصل على بيانات الطقس
        weather_condition = get_weather_condition(data['delivery_area'])
        
        # معامل الكوبون (إن وجد)
        special_offer = 1.0
        if 'coupon_code' in data:
            special_offer = apply_coupon(data['coupon_code'])
        
        # احسب السعر
        price_result = pricing_engine.calculate_final_price(
            pickup_lat=data['pickup_lat'],
            pickup_lon=data['pickup_lon'],
            delivery_lat=data['delivery_lat'],
            delivery_lon=data['delivery_lon'],
            active_orders=active_orders,
            available_drivers=available_drivers,
            weather_condition=weather_condition,
            delivery_area=data['delivery_area'],
            special_offer=special_offer
        )
        
        # سجل العملية
        log_pricing(data, price_result, weather_condition, active_orders, available_drivers)
        
        return jsonify({
            "success": True,
            "pricing": price_result,
            "market_info": {
                "active_orders": active_orders,
                "available_drivers": available_drivers,
                "demand_level": get_demand_level(active_orders, available_drivers)
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error calculating price: {str(e)}")
        return jsonify({"error": str(e)}), 500

@pricing_bp.route('/peak-hours', methods=['GET'])
def get_peak_hours():
    """
    احصل على معلومات أوقات الذروة
    """
    from dynamic_pricing_system import PeakHour
    
    peak_hours = {}
    for peak in PeakHour:
        hours_list = list(peak.value['hours'])
        peak_hours[peak.name] = {
            "hours": f"{hours_list[0]:02d}:00 - {hours_list[-1]+1:02d}:00",
            "multiplier": peak.value['multiplier']
        }
    
    return jsonify(peak_hours), 200

@pricing_bp.route('/demand-status', methods=['GET'])
def get_demand_status():
    """
    حالة الطلب والعرض الحالية
    """
    active_orders = get_active_orders_count()
    available_drivers = get_available_drivers_count()
    demand_level = get_demand_level(active_orders, available_drivers)
    
    return jsonify({
        "active_orders": active_orders,
        "available_drivers": available_drivers,
        "demand_level": demand_level,
        "surge_active": demand_level in ["HIGH", "VERY_HIGH"],
        "estimated_wait_time_minutes": calculate_wait_time(active_orders, available_drivers)
    }), 200

@pricing_bp.route('/pricing-history/<int:order_id>', methods=['GET'])
def get_pricing_history(order_id):
    """
    احصل على سجل التسعير للطلب
    """
    log = PricingLog.query.filter_by(order_id=order_id).first()
    
    if not log:
        return jsonify({"error": "Order not found"}), 404
    
    return jsonify({
        "order_id": log.order_id,
        "base_price": log.base_price,
        "final_price": log.final_price,
        "distance_km": log.distance_km,
        "multipliers": {
            "time": log.time_multiplier,
            "demand": log.demand_multiplier,
            "weather": log.weather_condition
        },
        "timestamp": log.timestamp.isoformat()
    }), 200

@pricing_bp.route('/analytics', methods=['GET'])
def get_pricing_analytics():
    """
    احصل على تحليلات التسعير
    """
    # إجمالي الإيرادات
    total_revenue = db.session.query(func.sum(PricingLog.final_price)).scalar() or 0
    
    # متوسط السعر
    avg_price = db.session.query(func.avg(PricingLog.final_price)).scalar() or 0
    
    # عدد الطلبات
    order_count = db.session.query(func.count(PricingLog.id)).scalar() or 0
    
    # معامل الطلب الأعلى
    max_demand_mult = db.session.query(func.max(PricingLog.demand_multiplier)).scalar() or 0
    
    return jsonify({
        "total_revenue": round(total_revenue, 2),
        "average_price": round(avg_price, 2),
        "total_orders": order_count,
        "max_surge_multiplier": round(max_demand_mult, 2),
        "peak_delivery_area": get_most_ordered_area()
    }), 200

# ============ HELPER FUNCTIONS ============

def get_active_orders_count():
    """احسب عدد الطلبات النشطة"""
    # استبدل هذا مع الاستعلام الفعلي من قاعدة البيانات
    from models import Order  # استيراد موديل الطلب
    return db.session.query(func.count(Order.id)).filter(
        Order.status.in_(['PENDING', 'CONFIRMED', 'DRIVER_ASSIGNED', 'IN_TRANSIT'])
    ).scalar() or 0

def get_available_drivers_count():
    """احسب عدد السائقين المتاحين"""
    # استبدل هذا مع الاستعلام الفعلي من قاعدة البيانات
    from models import Driver  # استيراد موديل السائق
    return db.session.query(func.count(Driver.id)).filter(
        Driver.status == 'AVAILABLE',
        Driver.is_online == True
    ).scalar() or 0

def get_weather_condition(area):
    """احصل على بيانات الطقس للمنطقة"""
    weather = WeatherData.query.filter_by(area=area).first()
    
    if not weather:
        return WeatherCondition.CLEAR
    
    weather_map = {
        'CLEAR': WeatherCondition.CLEAR,
        'CLOUDY': WeatherCondition.CLOUDY,
        'RAINY': WeatherCondition.RAINY,
        'SNOWY': WeatherCondition.SNOWY,
        'FOGGY': WeatherCondition.FOGGY
    }
    
    return weather_map.get(weather.condition, WeatherCondition.CLEAR)

def apply_coupon(coupon_code):
    """تطبيق كود الكوبون"""
    # استبدل هذا مع الاستعلام الفعلي عن الكوبونات
    coupons = {
        'WOLFIE20': 0.8,      # خصم 20%
        'WELCOME10': 0.9,     # خصم 10%
        'FREEDELIV': 0.5,     # توصيل مجاني (50% من السعر)
        'NYC30': 0.7           # خصم 30%
    }
    
    return coupons.get(coupon_code, 1.0)

def get_demand_level(active_orders, available_drivers):
    """حدد مستوى الطلب"""
    if available_drivers == 0:
        return "CRITICAL"
    
    ratio = active_orders / available_drivers
    
    if ratio < 1.0:
        return "LOW"
    elif ratio < 2.0:
        return "NORMAL"
    elif ratio < 3.0:
        return "HIGH"
    elif ratio < 5.0:
        return "VERY_HIGH"
    else:
        return "CRITICAL"

def calculate_wait_time(active_orders, available_drivers):
    """احسب وقت الانتظار المتوقع"""
    if available_drivers == 0:
        return 60
    
    return (active_orders / available_drivers) * 5  # كل طلب ≈ 5 دقائق

def get_most_ordered_area():
    """احصل على المنطقة الأكثر طلباً"""
    result = db.session.query(
        PricingLog.delivery_area,
        func.count(PricingLog.id).label('count')
    ).group_by(PricingLog.delivery_area).order_by(
        func.count(PricingLog.id).desc()
    ).first()
    
    return result[0] if result else "unknown"

def log_pricing(request_data, price_result, weather_condition, active_orders, available_drivers):
    """سجل عملية التسعير"""
    log = PricingLog(
        order_id=request_data.get('order_id', 0),
        base_price=price_result['base_price'],
        final_price=price_result['final_price'],
        distance_km=price_result['distance_km'],
        time_multiplier=price_result['time_multiplier'],
        demand_multiplier=price_result['demand_multiplier'],
        weather_condition=weather_condition.name,
        delivery_area=request_data['delivery_area'],
        active_orders=active_orders,
        available_drivers=available_drivers
    )
    
    db.session.add(log)
    db.session.commit()
