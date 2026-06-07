import json
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass
from typing import List, Dict, Optional
import requests
import logging

logger = logging.getLogger(__name__)

# ============ ENUMS ============

class NotificationType(Enum):
    """أنواع الإشعارات"""
    ORDER_CONFIRMED = "order_confirmed"
    DRIVER_ASSIGNED = "driver_assigned"
    DRIVER_ARRIVING = "driver_arriving"
    DRIVER_ARRIVED = "driver_arrived"
    ORDER_PICKED = "order_picked"
    ORDER_IN_TRANSIT = "order_in_transit"
    ORDER_DELIVERED = "order_delivered"
    ORDER_CANCELLED = "order_cancelled"
    PAYMENT_RECEIVED = "payment_received"
    PROMO_AVAILABLE = "promo_available"
    RATING_REQUEST = "rating_request"
    DRIVER_CANCELLED = "driver_cancelled"
    URGENT_MESSAGE = "urgent_message"

class NotificationPriority(Enum):
    """أولوية الإشعار"""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    URGENT = 4

class NotificationChannel(Enum):
    """قنوات الإرسال"""
    FIREBASE_CLOUD_MESSAGING = "fcm"
    WEB_PUSH = "web_push"
    SMS = "sms"
    EMAIL = "email"
    IN_APP = "in_app"

class UserRole(Enum):
    """دور المستخدم"""
    CUSTOMER = "customer"
    DRIVER = "driver"
    RESTAURANT = "restaurant"
    ADMIN = "admin"

# ============ DATA MODELS ============

@dataclass
class PushToken:
    """رمز الإشعارات للجهاز"""
    user_id: int
    device_type: str  # ios, android, web
    token: str
    is_active: bool = True
    created_at: datetime = None
    last_used: datetime = None

@dataclass
class NotificationTemplate:
    """قالب الإشعار"""
    template_id: str
    notification_type: NotificationType
    title_ar: str
    body_ar: str
    title_en: str
    body_en: str
    icon: str = None
    image: str = None
    action_url: str = None
    data_payload: Dict = None

@dataclass
class NotificationPayload:
    """بيانات الإشعار"""
    notification_id: str
    user_id: int
    user_role: UserRole
    notification_type: NotificationType
    priority: NotificationPriority
    title: str
    body: str
    icon: str = None
    image: str = None
    action_url: str = None
    data: Dict = None
    channels: List[NotificationChannel] = None
    language: str = "ar"
    created_at: datetime = None
    scheduled_at: datetime = None
    is_sent: bool = False

@dataclass
class NotificationLog:
    """سجل الإشعارات"""
    log_id: str
    notification_id: str
    user_id: int
    channel: NotificationChannel
    status: str  # sent, failed, delivered, clicked
    sent_at: datetime
    delivered_at: datetime = None
    clicked_at: datetime = None
    error_message: str = None

# ============ NOTIFICATION TEMPLATES ============

NOTIFICATION_TEMPLATES = {
    NotificationType.ORDER_CONFIRMED: NotificationTemplate(
        template_id="order_confirmed",
        notification_type=NotificationType.ORDER_CONFIRMED,
        title_ar="✅ تم تأكيد الطلب",
        body_ar="طلبك #{{order_id}} تم تأكيده. سيبدأ الإعداد الآن!",
        title_en="✅ Order Confirmed",
        body_en="Your order #{{order_id}} has been confirmed!",
        icon="order_icon.png",
        action_url="/orders/{{order_id}}"
    ),
    
    NotificationType.DRIVER_ASSIGNED: NotificationTemplate(
        template_id="driver_assigned",
        notification_type=NotificationType.DRIVER_ASSIGNED,
        title_ar="🚗 تم إسناد سائق",
        body_ar="السائق {{driver_name}} ⭐{{rating}} في طريقه إليك",
        title_en="🚗 Driver Assigned",
        body_en="Driver {{driver_name}} ⭐{{rating}} is on the way!",
        icon="driver_icon.png",
        action_url="/orders/{{order_id}}/track"
    ),
    
    NotificationType.DRIVER_ARRIVING: NotificationTemplate(
        template_id="driver_arriving",
        notification_type=NotificationType.DRIVER_ARRIVING,
        title_ar="⏰ السائق قريب",
        body_ar="السائق {{driver_name}} سيصل في {{arrival_time}} دقيقة",
        title_en="⏰ Driver Arriving Soon",
        body_en="Driver {{driver_name}} will arrive in {{arrival_time}} minutes",
        icon="arriving_icon.png",
        action_url="/orders/{{order_id}}/track"
    ),
    
    NotificationType.DRIVER_ARRIVED: NotificationTemplate(
        template_id="driver_arrived",
        notification_type=NotificationType.DRIVER_ARRIVED,
        title_ar="✨ السائق وصل",
        body_ar="السائق {{driver_name}} وصل إلى مكانك",
        title_en="✨ Driver Arrived",
        body_en="Driver {{driver_name}} has arrived at your location",
        icon="arrived_icon.png",
        action_url="/orders/{{order_id}}/track"
    ),
    
    NotificationType.ORDER_IN_TRANSIT: NotificationTemplate(
        template_id="order_in_transit",
        notification_type=NotificationType.ORDER_IN_TRANSIT,
        title_ar="🚀 الطلب في الطريق",
        body_ar="طلبك في الطريق! المسافة المتبقية: {{distance}} كم",
        title_en="🚀 Order In Transit",
        body_en="Your order is on the way! {{distance}} km remaining",
        icon="transit_icon.png",
        action_url="/orders/{{order_id}}/track"
    ),
    
    NotificationType.ORDER_DELIVERED: NotificationTemplate(
        template_id="order_delivered",
        notification_type=NotificationType.ORDER_DELIVERED,
        title_ar="🎉 تم التوصيل",
        body_ar="طلبك وصل! شكراً لاستخدام Wolfie",
        title_en="🎉 Delivered!",
        body_en="Your order has been delivered!",
        icon="delivered_icon.png",
        action_url="/orders/{{order_id}}/rate"
    ),
    
    NotificationType.PROMO_AVAILABLE: NotificationTemplate(
        template_id="promo_available",
        notification_type=NotificationType.PROMO_AVAILABLE,
        title_ar="🎁 عرض خاص لك",
        body_ar="استمتع بخصم {{discount}}% على طلبك القادم!",
        title_en="🎁 Special Offer",
        body_en="Get {{discount}}% off your next order!",
        icon="promo_icon.png",
        action_url="/promos/{{promo_id}}"
    ),
    
    NotificationType.RATING_REQUEST: NotificationTemplate(
        template_id="rating_request",
        notification_type=NotificationType.RATING_REQUEST,
        title_ar="⭐ قيّم تجربتك",
        body_ar="ساعدنا بتقييم السائق {{driver_name}} والطعام",
        title_en="⭐ Rate Your Experience",
        body_en="Help us by rating driver {{driver_name}} and your food",
        icon="rating_icon.png",
        action_url="/orders/{{order_id}}/rate"
    ),
}

# ============ SMART NOTIFICATION ENGINE ============

class SmartNotificationEngine:
    """
    محرك الإشعارات الذكي
    """
    
    def __init__(self):
        # Firebase Cloud Messaging Config
        self.fcm_url = "https://fcm.googleapis.com/fcm/send"
        self.fcm_api_key = None  # سيتم تعيينه من متغيرات البيئة
        
        # SMS Gateway Config (Twilio)
        self.sms_enabled = True
        self.twilio_account_sid = None
        self.twilio_auth_token = None
        
        # Email Config
        self.email_enabled = True
        self.smtp_server = None
        
        # إعدادات الإشعارات الذكية
        self.quiet_hours = {
            'start': 22,  # 10 PM
            'end': 8      # 8 AM
        }
        
        # تنصيف الإشعارات بناءً على الدور والنوع
        self.user_preferences = {}
        
        # سجل الإشعارات
        self.notification_logs = []
    
    def get_user_preferences(self, user_id: int) -> Dict:
        """
        احصل على تفضيلات المستخدم للإشعارات
        """
        return self.user_preferences.get(user_id, {
            'push_enabled': True,
            'sms_enabled': True,
            'email_enabled': True,
            'quiet_hours_enabled': True,
            'notification_types': {
                NotificationType.ORDER_CONFIRMED.value: True,
                NotificationType.DRIVER_ASSIGNED.value: True,
                NotificationType.DRIVER_ARRIVING.value: True,
                NotificationType.ORDER_DELIVERED.value: True,
                NotificationType.PROMO_AVAILABLE.value: True,
                NotificationType.RATING_REQUEST.value: False,
            }
        })
    
    def is_quiet_hours(self) -> bool:
        """
        تحقق ما إذا كنا في ساعات الهدوء (لا نرسل إشعارات)
        """
        current_hour = datetime.now().hour
        start = self.quiet_hours['start']
        end = self.quiet_hours['end']
        
        if start > end:  # مثلاً 22-8 (من 10 مساء إلى 8 صباح)
            return current_hour >= start or current_hour < end
        else:
            return start <= current_hour < end
    
    def should_send_notification(self, user_id: int, notification_type: NotificationType, 
                                priority: NotificationPriority) -> bool:
        """
        تحقق ما إذا كان يجب إرسال الإشعار
        """
        # احصل على تفضيلات المستخدم
        prefs = self.get_user_preferences(user_id)
        
        # تحقق من تفعيل الإشعارات العامة
        if not prefs['push_enabled']:
            return False
        
        # تحقق من تفعيل نوع الإشعار المحدد
        if not prefs['notification_types'].get(notification_type.value, True):
            return False
        
        # تحقق من ساعات الهدوء (الإشعارات العاجلة تُرسل حتى في ساعات الهدوء)
        if self.is_quiet_hours() and prefs['quiet_hours_enabled']:
            if priority != NotificationPriority.URGENT:
                return False
        
        return True
    
    def render_template(self, template: NotificationTemplate, data: Dict, language: str = "ar") -> tuple:
        """
        قم بتحويل قالب الإشعار مع البيانات الفعلية
        """
        title = template.title_ar if language == "ar" else template.title_en
        body = template.body_ar if language == "ar" else template.body_en
        
        # استبدل المتغيرات
        for key, value in data.items():
            placeholder = f"{{{{{key}}}}}"
            title = title.replace(placeholder, str(value))
            body = body.replace(placeholder, str(value))
        
        return title, body
    
    def send_firebase_notification(self, device_tokens: List[str], payload: NotificationPayload) -> bool:
        """
        أرسل إشعار عبر Firebase Cloud Messaging
        """
        if not device_tokens:
            logger.warning(f"No device tokens for user {payload.user_id}")
            return False
        
        try:
            headers = {
                "Authorization": f"key={self.fcm_api_key}",
                "Content-Type": "application/json"
            }
            
            fcm_payload = {
                "registration_ids": device_tokens,
                "notification": {
                    "title": payload.title,
                    "body": payload.body,
                    "icon": payload.icon,
                    "image": payload.image,
                    "click_action": payload.action_url
                },
                "data": payload.data or {},
                "priority": "high" if payload.priority in [NotificationPriority.HIGH, NotificationPriority.URGENT] else "normal",
                "time_to_live": 86400  # 24 ساعة
            }
            
            response = requests.post(self.fcm_url, json=fcm_payload, headers=headers)
            
            if response.status_code == 200:
                logger.info(f"FCM notification sent to {len(device_tokens)} devices")
                return True
            else:
                logger.error(f"FCM error: {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Firebase notification error: {str(e)}")
            return False
    
    def send_sms_notification(self, phone_number: str, payload: NotificationPayload) -> bool:
        """
        أرسل إشعار عبر SMS (Twilio)
        """
        if not self.sms_enabled or not phone_number:
            return False
        
        try:
            from twilio.rest import Client
            
            client = Client(self.twilio_account_sid, self.twilio_auth_token)
            
            message = client.messages.create(
                body=f"{payload.title}\n{payload.body}",
                from_="+1234567890",  # رقمك في Twilio
                to=phone_number
            )
            
            logger.info(f"SMS notification sent: {message.sid}")
            return True
            
        except Exception as e:
            logger.error(f"SMS notification error: {str(e)}")
            return False
    
    def send_email_notification(self, email: str, payload: NotificationPayload) -> bool:
        """
        أرسل إشعار عبر البريد الإلكتروني
        """
        if not self.email_enabled or not email:
            return False
        
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            # هذا مثال بسيط - استخدم خدمة بريد احترافية مثل SendGrid في الإنتاج
            msg = MIMEMultipart()
            msg['From'] = "notifications@wolfie.delivery"
            msg['To'] = email
            msg['Subject'] = payload.title
            
            body = f"""
            <html>
                <body style="font-family: Arial; direction: rtl;">
                    <h2>{payload.title}</h2>
                    <p>{payload.body}</p>
                    {f'<a href="{payload.action_url}">اضغط هنا</a>' if payload.action_url else ''}
                </body>
            </html>
            """
            
            msg.attach(MIMEText(body, 'html'))
            
            # في الإنتاج، استخدم SendGrid أو مشابه
            logger.info(f"Email notification sent to {email}")
            return True
            
        except Exception as e:
            logger.error(f"Email notification error: {str(e)}")
            return False
    
    def send_notification(self, payload: NotificationPayload, 
                         device_tokens: List[str] = None,
                         phone_number: str = None,
                         email: str = None) -> bool:
        """
        أرسل إشعار عبر قنوات متعددة
        """
        # تحقق ما إذا كان يجب إرسال الإشعار
        if not self.should_send_notification(payload.user_id, payload.notification_type, payload.priority):
            logger.info(f"Notification blocked by user preferences: {payload.user_id}")
            return False
        
        success = False
        
        # إرسال عبر Firebase (أساسي)
        if device_tokens and NotificationChannel.FIREBASE_CLOUD_MESSAGING in (payload.channels or []):
            if self.send_firebase_notification(device_tokens, payload):
                success = True
        
        # إرسال عبر SMS
        if phone_number and NotificationChannel.SMS in (payload.channels or []):
            if self.send_sms_notification(phone_number, payload):
                success = True
        
        # إرسال عبر البريد الإلكتروني
        if email and NotificationChannel.EMAIL in (payload.channels or []):
            if self.send_email_notification(email, payload):
                success = True
        
        # تسجيل الإشعار
        if success:
            self.log_notification(payload)
        
        return success
    
    def send_order_notification(self, order_id: int, user_id: int, user_role: UserRole,
                               notification_type: NotificationType, context_data: Dict,
                               priority: NotificationPriority = NotificationPriority.NORMAL) -> bool:
        """
        أرسل إشعار يتعلق بالطلب
        """
        # احصل على القالب
        template = NOTIFICATION_TEMPLATES.get(notification_type)
        if not template:
            logger.error(f"Template not found for {notification_type}")
            return False
        
        # أضف رقم الطلب للبيانات
        context_data['order_id'] = order_id
        
        # قم بتحويل القالب
        title, body = self.render_template(template, context_data)
        
        # أنشئ بيانات الإشعار
        payload = NotificationPayload(
            notification_id=f"{order_id}_{notification_type.value}_{datetime.now().timestamp()}",
            user_id=user_id,
            user_role=user_role,
            notification_type=notification_type,
            priority=priority,
            title=title,
            body=body,
            icon=template.icon,
            action_url=template.action_url,
            data={'order_id': str(order_id), **context_data},
            channels=[NotificationChannel.FIREBASE_CLOUD_MESSAGING, NotificationChannel.SMS],
            created_at=datetime.now()
        )
        
        # احصل على بيانات المستخدم من قاعدة البيانات
        device_tokens = self.get_user_device_tokens(user_id)
        phone_number = self.get_user_phone(user_id)
        email = self.get_user_email(user_id)
        
        # أرسل الإشعار
        return self.send_notification(payload, device_tokens, phone_number, email)
    
    def log_notification(self, payload: NotificationPayload):
        """
        سجل الإشعار في قاعدة البيانات
        """
        log = NotificationLog(
            log_id=f"{payload.notification_id}_{datetime.now().timestamp()}",
            notification_id=payload.notification_id,
            user_id=payload.user_id,
            channel=NotificationChannel.FIREBASE_CLOUD_MESSAGING,
            status="sent",
            sent_at=datetime.now()
        )
        self.notification_logs.append(log)
    
    def get_user_device_tokens(self, user_id: int) -> List[str]:
        """
        احصل على جميع أجهزة المستخدم
        """
        # هذا يجب أن يأتي من قاعدة البيانات
        # مثال للتوضيح:
        return [f"token_{user_id}_1", f"token_{user_id}_2"]
    
    def get_user_phone(self, user_id: int) -> str:
        """
        احصل على رقم هاتف المستخدم
        """
        # من قاعدة البيانات
        return None
    
    def get_user_email(self, user_id: int) -> str:
        """
        احصل على بريد المستخدم
        """
        # من قاعدة البيانات
        return None
    
    def get_notification_stats(self) -> Dict:
        """
        احصل على إحصائيات الإشعارات
        """
        total = len(self.notification_logs)
        sent = sum(1 for log in self.notification_logs if log.status == "sent")
        delivered = sum(1 for log in self.notification_logs if log.status == "delivered")
        clicked = sum(1 for log in self.notification_logs if log.status == "clicked")
        
        return {
            'total_notifications': total,
            'sent': sent,
            'delivered': delivered,
            'clicked': clicked,
            'click_through_rate': (clicked / sent * 100) if sent > 0 else 0,
            'delivery_rate': (delivered / sent * 100) if sent > 0 else 0
        }

# ============ EXAMPLES ============

if __name__ == "__main__":
    engine = SmartNotificationEngine()
    
    print("=" * 80)
    print("🐺 Smart Notification Engine - Examples")
    print("=" * 80)
    
    # مثال 1: إرسال إشعار تأكيد الطلب
    print("\n📦 مثال 1: إرسال إشعار تأكيد الطلب")
    print("=" * 80)
    
    context = {
        'order_id': 1001,
        'restaurant_name': 'Italian Express'
    }
    
    result = engine.send_order_notification(
        order_id=1001,
        user_id=123,
        user_role=UserRole.CUSTOMER,
        notification_type=NotificationType.ORDER_CONFIRMED,
        context_data=context,
        priority=NotificationPriority.NORMAL
    )
    
    print(f"✅ تم إرسال الإشعار: {result}")
    
    # مثال 2: إرسال إشعار إسناد السائق
    print("\n🚗 مثال 2: إرسال إشعار إسناد السائق")
    print("=" * 80)
    
    context = {
        'driver_name': 'Ahmed Ali',
        'rating': 4.8,
        'order_id': 1001
    }
    
    result = engine.send_order_notification(
        order_id=1001,
        user_id=123,
        user_role=UserRole.CUSTOMER,
        notification_type=NotificationType.DRIVER_ASSIGNED,
        context_data=context,
        priority=NotificationPriority.HIGH
    )
    
    print(f"✅ تم إرسال الإشعار: {result}")
    
    # مثال 3: إرسال إشعار عرض خاص
    print("\n🎁 مثال 3: إرسال إشعار عرض خاص")
    print("=" * 80)
    
    context = {
        'discount': 25,
        'promo_id': 'WOLFIE25'
    }
    
    result = engine.send_order_notification(
        order_id=0,  # لا يتعلق بطلب محدد
        user_id=123,
        user_role=UserRole.CUSTOMER,
        notification_type=NotificationType.PROMO_AVAILABLE,
        context_data=context,
        priority=NotificationPriority.NORMAL
    )
    
    print(f"✅ تم إرسال الإشعار: {result}")
    
    # عرض الإحصائيات
    print("\n📊 إحصائيات الإشعارات:")
    print("=" * 80)
    stats = engine.get_notification_stats()
    for key, value in stats.items():
        print(f"{key}: {value}")
