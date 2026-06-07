from flask import Blueprint, request, jsonify
from datetime import datetime
from smart_matching_engine import (
    SmartMatchingEngine, Driver, Order, Location, 
    DriverStatus, OrderPriority, VehicleType
)
from sqlalchemy import func
import logging

matching_bp = Blueprint('matching', __name__, url_prefix='/api/matching')
matching_engine = SmartMatchingEngine()

logger = logging.getLogger(__name__)

# ============ DATABASE MODELS ============
# (أضف هذي للـ models.py)

from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean, JSON
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class MatchHistory(db.Model):
    """سجل الربط بين الطلبات والسائقين"""
    __tablename__ = 'match_history'
    
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, nullable=False, unique=True)
    driver_id = Column(Integer, nullable=False)
    match_score = Column(Float, nullable=False)
    distance_km = Column(Float, nullable=False)
    estimated_pickup_time = Column(Integer, nullable=False)
    was_accepted = Column(Boolean, default=False)
    was_completed = Column(Boolean, default=False)
    actual_pickup_time = Column(Integer, nullable=True)
    actual_delivery_time = Column(Integer, nullable=True)
    accuracy = Column(Float, default=0)  # دقة التنبؤ
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    INDEX_order_driver = ('order_id', 'driver_id')

class DriverPerformance(db.Model):
    """إحصائيات أداء السائق"""
    __tablename__ = 'driver_performance'
    
    id = Column(Integer, primary_key=True)
    driver_id = Column(Integer, unique=True, nullable=False)
    total_matches = Column(Integer, default=0)
    accepted_matches = Column(Integer, default=0)
    completed_deliveries = Column(Integer, default=0)
    accuracy_score = Column(Float, default=0)  # كم مرة كان أفضل خيار
    average_pickup_time = Column(Float, default=0)
    average_delivery_time = Column(Float, default=0)
    last_updated = Column(DateTime, default=datetime.utcnow)

class MatchingRules(db.Model):
    """قواعس الربط المخصصة"""
    __tablename__ = 'matching_rules'
    
    id = Column(Integer, primary_key=True)
    rule_name = Column(String(100), nullable=False)
    rule_type = Column(String(50), nullable=False)  # distance, rating, area, etc
    min_value = Column(Float)
    max_value = Column(Float)
    priority = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# ============ FLASK ROUTES ============

@matching_bp.route('/find-driver', methods=['POST'])
def find_driver():
    """
    ابحث عن أفضل سائق للطلب
    
    Request JSON:
    {
        "order_id": 1001,
        "restaurant_lat": 40.7580,
        "restaurant_lon": -73.9855,
        "delivery_lat": 40.7489,
        "delivery_lon": -73.9680,
        "order_priority": "HIGH",
        "food_type": "Italian",
        "temperature_sensitive": true,
        "heavy_item": false
    }
    """
    try:
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required = ['order_id', 'restaurant_lat', 'restaurant_lon', 
                   'delivery_lat', 'delivery_lon']
        if not all(field in data for field in required):
            return jsonify({"error": "Missing required fields"}), 400
        
        # إنشاء كائن الطلب
        order = Order(
            order_id=data['order_id'],
            restaurant_location=Location(data['restaurant_lat'], data['restaurant_lon']),
            delivery_location=Location(data['delivery_lat'], data['delivery_lon']),
            priority=OrderPriority[data.get('order_priority', 'NORMAL')],
            estimated_ready_time=data.get('estimated_ready_time', 15),
            food_type=data.get('food_type', 'General'),
            special_requirements=data.get('special_requirements', ''),
            customer_rating=data.get('customer_rating', 4.0),
            order_value=data.get('order_value', 0),
            created_time=datetime.now(),
            temperature_sensitive=data.get('temperature_sensitive', False),
            heavy_item=data.get('heavy_item', False)
        )
        
        # احصل على السائقين المتاحين
        available_drivers = get_available_drivers_list()
        
        if not available_drivers:
            return jsonify({"error": "No drivers available", "order_id": data['order_id']}), 404
        
        # ابحث عن أفضل سائق
        best_match = matching_engine.find_best_match(available_drivers, order)
        
        if not best_match:
            return jsonify({"error": "No suitable driver found", "order_id": data['order_id']}), 404
        
        driver, score, details = best_match
        
        # سجل عملية الربط
        log_match_history(data['order_id'], driver.driver_id, score, details)
        
        return jsonify({
            "success": True,
            "order_id": data['order_id'],
            "assigned_driver": details,
            "alternative_options": get_top_alternative_drivers(available_drivers, order, 2)
        }), 200
        
    except Exception as e:
        logger.error(f"Error finding driver: {str(e)}")
        return jsonify({"error": str(e)}), 500

@matching_bp.route('/find-top-drivers', methods=['POST'])
def find_top_drivers():
    """
    ابحث عن أفضل N سائقين للطلب
    """
    try:
        data = request.get_json()
        top_n = data.get('top_n', 5)
        
        # إنشاء كائن الطلب
        order = Order(
            order_id=data['order_id'],
            restaurant_location=Location(data['restaurant_lat'], data['restaurant_lon']),
            delivery_location=Location(data['delivery_lat'], data['delivery_lon']),
            priority=OrderPriority[data.get('order_priority', 'NORMAL')],
            estimated_ready_time=data.get('estimated_ready_time', 15),
            food_type=data.get('food_type', 'General'),
            special_requirements=data.get('special_requirements', ''),
            customer_rating=data.get('customer_rating', 4.0),
            order_value=data.get('order_value', 0),
            created_time=datetime.now(),
            temperature_sensitive=data.get('temperature_sensitive', False),
            heavy_item=data.get('heavy_item', False)
        )
        
        # احصل على السائقين المتاحين
        available_drivers = get_available_drivers_list()
        
        # ابحث عن أفضل N سائقين
        top_matches = matching_engine.find_top_matches(available_drivers, order, top_n)
        
        options = []
        for driver, score, details in top_matches:
            options.append({
                "option_number": len(options) + 1,
                "driver": details,
                "match_score": round(score, 2)
            })
        
        return jsonify({
            "success": True,
            "order_id": data['order_id'],
            "options": options,
            "total_options": len(options)
        }), 200
        
    except Exception as e:
        logger.error(f"Error finding top drivers: {str(e)}")
        return jsonify({"error": str(e)}), 500

@matching_bp.route('/analyze-match/<int:driver_id>/<int:order_id>', methods=['GET'])
def analyze_match(driver_id, order_id):
    """
    احصل على تحليل مفصل للتطابق بين سائق وطلب
    """
    try:
        # احصل على بيانات السائق والطلب من قاعدة البيانات
        driver = get_driver_from_db(driver_id)
        order = get_order_from_db(order_id)
        
        if not driver or not order:
            return jsonify({"error": "Driver or order not found"}), 404
        
        # احصل على التحليل المفصل
        analysis = matching_engine.get_detailed_analysis(driver, order)
        
        return jsonify({
            "success": True,
            "analysis": analysis
        }), 200
        
    except Exception as e:
        logger.error(f"Error analyzing match: {str(e)}")
        return jsonify({"error": str(e)}), 500

@matching_bp.route('/match-accuracy', methods=['GET'])
def get_match_accuracy():
    """
    احصل على دقة خوارزمية الربط
    """
    try:
        # احسب نسبة النجاح
        total_matches = db.session.query(func.count(MatchHistory.id)).scalar() or 0
        accepted_matches = db.session.query(func.count(MatchHistory.id)).filter(
            MatchHistory.was_accepted == True
        ).scalar() or 0
        completed_matches = db.session.query(func.count(MatchHistory.id)).filter(
            MatchHistory.was_completed == True
        ).scalar() or 0
        
        acceptance_rate = (accepted_matches / total_matches * 100) if total_matches > 0 else 0
        completion_rate = (completed_matches / total_matches * 100) if total_matches > 0 else 0
        
        # احسب متوسط دقة التنبؤ
        avg_accuracy = db.session.query(func.avg(MatchHistory.accuracy)).scalar() or 0
        
        return jsonify({
            "success": True,
            "total_matches": total_matches,
            "acceptance_rate": round(acceptance_rate, 2),
            "completion_rate": round(completion_rate, 2),
            "prediction_accuracy": round(avg_accuracy, 2),
            "algorithm_health": "Healthy" if avg_accuracy > 80 else "Good" if avg_accuracy > 60 else "Needs Improvement"
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting accuracy: {str(e)}")
        return jsonify({"error": str(e)}), 500

@matching_bp.route('/driver-stats/<int:driver_id>', methods=['GET'])
def get_driver_stats(driver_id):
    """
    احصل على إحصائيات أداء السائق من خوارزمية الربط
    """
    try:
        stats = db.session.query(DriverPerformance).filter_by(driver_id=driver_id).first()
        
        if not stats:
            return jsonify({"error": "Driver stats not found"}), 404
        
        acceptance_rate = (stats.accepted_matches / stats.total_matches * 100) if stats.total_matches > 0 else 0
        
        return jsonify({
            "success": True,
            "driver_id": driver_id,
            "total_matches": stats.total_matches,
            "accepted_matches": stats.accepted_matches,
            "completed_deliveries": stats.completed_deliveries,
            "acceptance_rate": round(acceptance_rate, 2),
            "accuracy_score": round(stats.accuracy_score, 2),
            "average_pickup_time_minutes": round(stats.average_pickup_time, 2),
            "average_delivery_time_minutes": round(stats.average_delivery_time, 2)
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting driver stats: {str(e)}")
        return jsonify({"error": str(e)}), 500

@matching_bp.route('/weights', methods=['GET'])
def get_weights():
    """
    احصل على أوزان معايير الربط الحالية
    """
    return jsonify({
        "success": True,
        "weights": matching_engine.weights,
        "description": "أوزان معايير الربط بين الطلبات والسائقين"
    }), 200

@matching_bp.route('/weights', methods=['PUT'])
def update_weights():
    """
    حدّث أوزان معايير الربط
    """
    try:
        data = request.get_json()
        
        # تحقق من أن مجموع الأوزان = 1.0
        total_weight = sum(data.get('weights', {}).values())
        
        if abs(total_weight - 1.0) > 0.01:
            return jsonify({"error": "Total weights must equal 1.0"}), 400
        
        matching_engine.weights = data['weights']
        
        return jsonify({
            "success": True,
            "message": "Weights updated successfully",
            "new_weights": matching_engine.weights
        }), 200
        
    except Exception as e:
        logger.error(f"Error updating weights: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ============ HELPER FUNCTIONS ============

def get_available_drivers_list() -> list:
    """احصل على قائمة السائقين المتاحين من قاعدة البيانات"""
    # هذا مثال - استبدله بالاستعلام الفعلي
    from models import Driver as DBDriver
    
    drivers = []
    db_drivers = db.session.query(DBDriver).filter_by(is_online=True).all()
    
    for db_driver in db_drivers:
        driver = Driver(
            driver_id=db_driver.id,
            name=db_driver.name,
            location=Location(db_driver.latitude, db_driver.longitude),
            status=DriverStatus.AVAILABLE if db_driver.status == 'AVAILABLE' else DriverStatus.ON_DELIVERY,
            vehicle_type=VehicleType[db_driver.vehicle_type.upper()],
            current_load=db_driver.current_load,
            max_load=db_driver.max_load,
            rating=db_driver.rating,
            completion_rate=db_driver.completion_rate,
            avg_delivery_time=db_driver.avg_delivery_time,
            total_deliveries=db_driver.total_deliveries,
            acceptance_rate=db_driver.acceptance_rate,
            preferred_areas=db_driver.preferred_areas.split(',') if db_driver.preferred_areas else [],
            last_active_time=db_driver.last_active_time,
            balance=db_driver.balance
        )
        drivers.append(driver)
    
    return drivers

def get_top_alternative_drivers(drivers, order, count=2):
    """احصل على أفضل خيارات بديلة"""
    top_matches = matching_engine.find_top_matches(drivers, order, count + 1)
    
    # تخطي الخيار الأول (أفضل واحد)
    alternatives = []
    for idx, (driver, score, details) in enumerate(top_matches[1:count+1], 1):
        alternatives.append({
            "option_number": idx,
            "driver": details,
            "match_score": round(score, 2)
        })
    
    return alternatives

def log_match_history(order_id, driver_id, match_score, details):
    """سجل عملية الربط في قاعدة البيانات"""
    try:
        history = MatchHistory(
            order_id=order_id,
            driver_id=driver_id,
            match_score=match_score,
            distance_km=details['distance_km'],
            estimated_pickup_time=details['estimated_pickup_time'],
            timestamp=datetime.utcnow()
        )
        db.session.add(history)
        db.session.commit()
    except Exception as e:
        logger.error(f"Error logging match history: {str(e)}")

def get_driver_from_db(driver_id):
    """احصل على بيانات السائق من قاعدة البيانات"""
    # استبدل هذا بالاستعلام الفعلي
    pass

def get_order_from_db(order_id):
    """احصل على بيانات الطلب من قاعدة البيانات"""
    # استبدل هذا بالاستعلام الفعلي
    pass
