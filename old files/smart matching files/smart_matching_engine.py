import math
from datetime import datetime
from enum import Enum
from dataclasses import dataclass
from typing import List, Dict, Tuple, Optional

# ============ ENUMS ============

class DriverStatus(Enum):
    OFFLINE = 0
    AVAILABLE = 1
    ON_DELIVERY = 2
    BREAK = 3

class OrderPriority(Enum):
    LOW = 1
    NORMAL = 2
    HIGH = 3
    URGENT = 4

class VehicleType(Enum):
    BICYCLE = 1
    MOTORCYCLE = 2
    CAR = 3
    VAN = 4

# ============ DATA MODELS ============

@dataclass
class Location:
    """موقع جغرافي"""
    latitude: float
    longitude: float
    
    def distance_to(self, other: 'Location') -> float:
        """احسب المسافة من موقع لآخر (Haversine formula)"""
        R = 6371  # نصف قطر الأرض بالكيلومترات
        
        lat1, lon1 = math.radians(self.latitude), math.radians(self.longitude)
        lat2, lon2 = math.radians(other.latitude), math.radians(other.longitude)
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c

@dataclass
class Driver:
    """معلومات السائق"""
    driver_id: int
    name: str
    location: Location
    status: DriverStatus
    vehicle_type: VehicleType
    current_load: int  # عدد الطلبات الحالية
    max_load: int  # الحد الأقصى للطلبات
    rating: float  # التقييم من 1-5
    completion_rate: float  # نسبة الإكمال (0-100)
    avg_delivery_time: float  # متوسط وقت التوصيل بالدقائق
    total_deliveries: int
    acceptance_rate: float  # نسبة قبول الطلبات
    preferred_areas: List[str]  # المناطق المفضلة
    last_active_time: datetime
    balance: float  # الرصيد أو الأرباح المعلقة
    
    def is_available(self) -> bool:
        """تحقق ما إذا كان السائق متاحاً"""
        return (self.status == DriverStatus.AVAILABLE and 
                self.current_load < self.max_load)
    
    def can_reach_location(self, location: Location, max_distance_km: float = 10) -> bool:
        """تحقق ما إذا كان السائق قادر على الوصول"""
        distance = self.location.distance_to(location)
        return distance <= max_distance_km

@dataclass
class Order:
    """معلومات الطلب"""
    order_id: int
    restaurant_location: Location
    delivery_location: Location
    priority: OrderPriority
    estimated_ready_time: int  # بالدقائق
    food_type: str  # نوع الطعام (Italian, Chinese, etc)
    special_requirements: str  # متطلبات خاصة
    customer_rating: float  # تقييم العميل
    order_value: float  # قيمة الطلب بالدولار
    created_time: datetime
    preferred_driver_id: Optional[int] = None
    temperature_sensitive: bool = False  # هل يحتاج برودة
    heavy_item: bool = False  # هل يحتوي على أشياء ثقيلة

# ============ MATCHING ENGINE ============

class SmartMatchingEngine:
    """
    محرك الربط الذكي بين الطلبات والسائقين
    """
    
    def __init__(self):
        # أوزان المعايير (يمكن تعديلها حسب الحاجة)
        self.weights = {
            'distance': 0.25,           # 25% - القرب أهم عامل
            'load': 0.15,              # 15% - عدم الازدحام
            'rating': 0.20,            # 20% - التقييم العالي
            'completion_rate': 0.10,   # 10% - معدل الإكمال
            'acceptance_rate': 0.10,   # 10% - معدل القبول
            'preferred_area': 0.10,    # 10% - المناطق المفضلة
            'vehicle_type': 0.05,      # 5% - نوع المركبة
            'delivery_time': 0.05      # 5% - سرعة التوصيل
        }
        
        # حدود المسافة حسب نوع المركبة
        self.max_distance_by_vehicle = {
            VehicleType.BICYCLE: 5.0,
            VehicleType.MOTORCYCLE: 15.0,
            VehicleType.CAR: 25.0,
            VehicleType.VAN: 30.0
        }
        
        # أوقات التوصيل المتوقعة (دقيقة/كم)
        self.minutes_per_km = {
            VehicleType.BICYCLE: 3.0,
            VehicleType.MOTORCYCLE: 2.0,
            VehicleType.CAR: 2.5,
            VehicleType.VAN: 3.0
        }
    
    def calculate_distance_score(self, driver: Driver, order: Order) -> float:
        """
        احسب درجة المسافة (كلما أقل المسافة = درجة أعلى)
        النتيجة من 0-100
        """
        distance = driver.location.distance_to(order.restaurant_location)
        max_distance = self.max_distance_by_vehicle[driver.vehicle_type]
        
        if distance > max_distance:
            return 0.0  # السائق بعيد جداً
        
        # كلما قل المسافة، زادت الدرجة
        score = 100 * (1 - distance / max_distance)
        return max(0, score)
    
    def calculate_load_score(self, driver: Driver) -> float:
        """
        احسب درجة التحميل (كلما قل التحميل = درجة أعلى)
        النتيجة من 0-100
        """
        if driver.max_load == 0:
            return 0.0
        
        load_ratio = driver.current_load / driver.max_load
        
        # تفضيل السائقين بأقل حمل
        if load_ratio < 0.5:
            return 100.0
        elif load_ratio < 0.75:
            return 75.0
        elif load_ratio < 1.0:
            return 50.0
        else:
            return 0.0  # السائق في الحد الأقصى
    
    def calculate_rating_score(self, driver: Driver) -> float:
        """
        احسب درجة التقييم
        النتيجة من 0-100
        """
        if driver.rating < 3.5:
            return 0.0  # لا تختر سائق بتقييم منخفض
        
        # حول التقييم (1-5) إلى درجة (0-100)
        score = (driver.rating - 1) * 25
        return min(100, score)
    
    def calculate_completion_rate_score(self, driver: Driver) -> float:
        """
        احسب درجة معدل الإكمال
        النتيجة من 0-100
        """
        return min(100, driver.completion_rate)
    
    def calculate_acceptance_rate_score(self, driver: Driver) -> float:
        """
        احسب درجة معدل القبول
        النتيجة من 0-100
        """
        return min(100, driver.acceptance_rate)
    
    def calculate_area_preference_score(self, driver: Driver, order: Order) -> float:
        """
        احسب درجة تفضيل المنطقة
        النتيجة من 0-100
        """
        # افترض أن delivery_location لديها منطقة
        if not hasattr(order.delivery_location, 'area'):
            return 50.0  # درجة محايدة
        
        if order.delivery_location.area in driver.preferred_areas:
            return 100.0  # السائق يفضل هذه المنطقة
        else:
            return 50.0  # درجة محايدة
    
    def calculate_vehicle_type_score(self, driver: Driver, order: Order) -> float:
        """
        احسب درجة التوافق بين نوع المركبة والطلب
        النتيجة من 0-100
        """
        if order.heavy_item and driver.vehicle_type in [VehicleType.BICYCLE, VehicleType.MOTORCYCLE]:
            return 0.0  # لا يمكن لدراجة أو موتسيكل نقل أشياء ثقيلة
        
        if order.temperature_sensitive and driver.vehicle_type == VehicleType.BICYCLE:
            return 50.0  # الدراجة ليست مثالية للطعام الحساس
        
        return 100.0  # مناسب
    
    def calculate_delivery_time_score(self, driver: Driver) -> float:
        """
        احسب درجة سرعة التوصيل
        النتيجة من 0-100
        """
        # السائقون الأسرع يحصلون على درجة أعلى
        avg_time = driver.avg_delivery_time
        
        if avg_time < 15:
            return 100.0  # أسرع من المتوسط
        elif avg_time < 20:
            return 80.0
        elif avg_time < 30:
            return 60.0
        else:
            return 40.0
    
    def calculate_match_score(self, driver: Driver, order: Order) -> float:
        """
        احسب درجة التطابق الكلية (0-100)
        """
        if not driver.is_available():
            return 0.0
        
        if not driver.can_reach_location(order.restaurant_location):
            return 0.0
        
        # احسب درجات كل معيار
        scores = {
            'distance': self.calculate_distance_score(driver, order),
            'load': self.calculate_load_score(driver),
            'rating': self.calculate_rating_score(driver),
            'completion_rate': self.calculate_completion_rate_score(driver),
            'acceptance_rate': self.calculate_acceptance_rate_score(driver),
            'preferred_area': self.calculate_area_preference_score(driver, order),
            'vehicle_type': self.calculate_vehicle_type_score(driver, order),
            'delivery_time': self.calculate_delivery_time_score(driver)
        }
        
        # احسب الدرجة المرجحة
        total_score = sum(scores[key] * self.weights[key] for key in scores)
        
        return total_score
    
    def find_best_match(self, drivers: List[Driver], order: Order) -> Optional[Tuple[Driver, float, Dict]]:
        """
        ابحث عن أفضل سائق للطلب
        """
        best_driver = None
        best_score = -1
        match_details = {}
        
        for driver in drivers:
            score = self.calculate_match_score(driver, order)
            
            if score > best_score:
                best_score = score
                best_driver = driver
                match_details = {
                    'driver_id': driver.driver_id,
                    'driver_name': driver.name,
                    'match_score': score,
                    'distance_km': driver.location.distance_to(order.restaurant_location),
                    'estimated_pickup_time': int(driver.location.distance_to(order.restaurant_location) * self.minutes_per_km[driver.vehicle_type]),
                    'vehicle_type': driver.vehicle_type.name
                }
        
        return (best_driver, best_score, match_details) if best_score > 0 else None
    
    def find_top_matches(self, drivers: List[Driver], order: Order, top_n: int = 5) -> List[Tuple[Driver, float, Dict]]:
        """
        ابحث عن أفضل N سائقين للطلب
        """
        matches = []
        
        for driver in drivers:
            score = self.calculate_match_score(driver, order)
            
            if score > 0:
                distance = driver.location.distance_to(order.restaurant_location)
                pickup_time = int(distance * self.minutes_per_km[driver.vehicle_type])
                
                match_details = {
                    'driver_id': driver.driver_id,
                    'driver_name': driver.name,
                    'match_score': score,
                    'distance_km': round(distance, 2),
                    'estimated_pickup_time': pickup_time,
                    'vehicle_type': driver.vehicle_type.name,
                    'rating': driver.rating,
                    'completion_rate': driver.completion_rate
                }
                
                matches.append((driver, score, match_details))
        
        # رتب حسب الدرجة (تنازلي)
        matches.sort(key=lambda x: x[1], reverse=True)
        
        return matches[:top_n]
    
    def get_detailed_analysis(self, driver: Driver, order: Order) -> Dict:
        """
        احصل على تحليل مفصل للتطابق
        """
        distance = driver.location.distance_to(order.restaurant_location)
        
        return {
            'driver_id': driver.driver_id,
            'driver_name': driver.name,
            'vehicle_type': driver.vehicle_type.name,
            'current_load': driver.current_load,
            'max_load': driver.max_load,
            'rating': driver.rating,
            'total_deliveries': driver.total_deliveries,
            'completion_rate': driver.completion_rate,
            'acceptance_rate': driver.acceptance_rate,
            'distance_km': round(distance, 2),
            'estimated_pickup_time_minutes': int(distance * self.minutes_per_km[driver.vehicle_type]),
            'scores': {
                'distance': round(self.calculate_distance_score(driver, order), 2),
                'load': round(self.calculate_load_score(driver), 2),
                'rating': round(self.calculate_rating_score(driver), 2),
                'completion_rate': round(self.calculate_completion_rate_score(driver), 2),
                'acceptance_rate': round(self.calculate_acceptance_rate_score(driver), 2),
                'area_preference': round(self.calculate_area_preference_score(driver, order), 2),
                'vehicle_type': round(self.calculate_vehicle_type_score(driver, order), 2),
                'delivery_time': round(self.calculate_delivery_time_score(driver), 2),
            },
            'overall_score': round(self.calculate_match_score(driver, order), 2)
        }


# ============ EXAMPLES ============

if __name__ == "__main__":
    # إنشاء محرك الربط
    engine = SmartMatchingEngine()
    
    # مثال 1: إنشاء بيانات سائقين
    print("=" * 80)
    print("🐺 Smart Matching Algorithm - Examples")
    print("=" * 80)
    
    drivers = [
        Driver(
            driver_id=1,
            name="Ahmed Ali",
            location=Location(40.7128, -74.0060),  # Manhattan
            status=DriverStatus.AVAILABLE,
            vehicle_type=VehicleType.MOTORCYCLE,
            current_load=1,
            max_load=3,
            rating=4.8,
            completion_rate=98.0,
            avg_delivery_time=16.0,
            total_deliveries=450,
            acceptance_rate=95.0,
            preferred_areas=['manhattan', 'brooklyn'],
            last_active_time=datetime.now(),
            balance=150.50
        ),
        Driver(
            driver_id=2,
            name="Mohammed Hassan",
            location=Location(40.6782, -73.9442),  # Brooklyn
            status=DriverStatus.AVAILABLE,
            vehicle_type=VehicleType.CAR,
            current_load=2,
            max_load=5,
            rating=4.5,
            completion_rate=95.0,
            avg_delivery_time=20.0,
            total_deliveries=320,
            acceptance_rate=92.0,
            preferred_areas=['brooklyn', 'queens'],
            last_active_time=datetime.now(),
            balance=200.00
        ),
        Driver(
            driver_id=3,
            name="Khalid Ibrahim",
            location=Location(40.8448, -73.8648),  # Bronx
            status=DriverStatus.ON_DELIVERY,
            vehicle_type=VehicleType.BICYCLE,
            current_load=3,
            max_load=3,
            rating=4.2,
            completion_rate=90.0,
            avg_delivery_time=25.0,
            total_deliveries=200,
            acceptance_rate=88.0,
            preferred_areas=['manhattan'],
            last_active_time=datetime.now(),
            balance=85.25
        ),
        Driver(
            driver_id=4,
            name="Sara Khan",
            location=Location(40.7489, -73.9680),  # Midtown
            status=DriverStatus.AVAILABLE,
            vehicle_type=VehicleType.MOTORCYCLE,
            current_load=0,
            max_load=4,
            rating=4.9,
            completion_rate=99.0,
            avg_delivery_time=14.0,
            total_deliveries=650,
            acceptance_rate=98.0,
            preferred_areas=['manhattan', 'brooklyn', 'queens'],
            last_active_time=datetime.now(),
            balance=350.00
        ),
    ]
    
    # مثال 2: إنشاء طلب
    order = Order(
        order_id=1001,
        restaurant_location=Location(40.7580, -73.9855),  # Times Square
        delivery_location=Location(40.7489, -73.9680),    # Midtown
        priority=OrderPriority.HIGH,
        estimated_ready_time=15,
        food_type="Italian",
        special_requirements="No onions, extra hot sauce",
        customer_rating=4.7,
        order_value=45.99,
        created_time=datetime.now(),
        temperature_sensitive=True,
        heavy_item=False
    )
    
    print(f"\n📦 طلب جديد:")
    print(f"   Order ID: {order.order_id}")
    print(f"   من: ({order.restaurant_location.latitude}, {order.restaurant_location.longitude})")
    print(f"   إلى: ({order.delivery_location.latitude}, {order.delivery_location.longitude})")
    print(f"   النوع: {order.food_type}")
    print(f"   القيمة: ${order.order_value}")
    
    # مثال 3: إيجاد أفضل سائق
    print("\n" + "=" * 80)
    print("🔍 البحث عن أفضل سائق...")
    print("=" * 80)
    
    best_match = engine.find_best_match(drivers, order)
    
    if best_match:
        driver, score, details = best_match
        print(f"\n✅ أفضل تطابق:")
        print(f"   السائق: {details['driver_name']} (#{details['driver_id']})")
        print(f"   درجة التطابق: {details['match_score']:.2f}/100")
        print(f"   المسافة: {details['distance_km']:.2f} كم")
        print(f"   وقت الاستلام المتوقع: {details['estimated_pickup_time']} دقيقة")
        print(f"   نوع المركبة: {details['vehicle_type']}")
    
    # مثال 4: إيجاد أفضل 3 سائقين
    print("\n" + "=" * 80)
    print("📊 أفضل 3 خيارات:")
    print("=" * 80)
    
    top_matches = engine.find_top_matches(drivers, order, top_n=3)
    
    for idx, (driver, score, details) in enumerate(top_matches, 1):
        print(f"\n{idx}. {details['driver_name']} (درجة: {score:.2f}/100)")
        print(f"   المسافة: {details['distance_km']} كم")
        print(f"   وقت الاستلام: {details['estimated_pickup_time']} دقيقة")
        print(f"   التقييم: ⭐ {details['rating']}/5")
        print(f"   معدل الإكمال: {details['completion_rate']:.1f}%")
    
    # مثال 5: تحليل مفصل
    print("\n" + "=" * 80)
    print("📈 تحليل مفصل للسائق الأول:")
    print("=" * 80)
    
    if best_match:
        driver, _, _ = best_match
        analysis = engine.get_detailed_analysis(driver, order)
        
        print(f"\n👤 معلومات السائق:")
        print(f"   الاسم: {analysis['driver_name']}")
        print(f"   نوع المركبة: {analysis['vehicle_type']}")
        print(f"   التحميل الحالي: {analysis['current_load']}/{analysis['max_load']}")
        print(f"   التقييم: {analysis['rating']}/5 ⭐")
        print(f"   إجمالي التوصيلات: {analysis['total_deliveries']}")
        
        print(f"\n📐 معايير التطابق:")
        for metric, value in analysis['scores'].items():
            print(f"   {metric}: {value}/100")
        
        print(f"\n🎯 الدرجة الكلية: {analysis['overall_score']}/100")
        print(f"   المسافة: {analysis['distance_km']} كم")
        print(f"   وقت الاستلام: {analysis['estimated_pickup_time_minutes']} دقيقة")
