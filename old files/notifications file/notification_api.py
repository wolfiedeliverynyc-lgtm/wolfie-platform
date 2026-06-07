from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from push_notification_engine import (
    SmartNotificationEngine, NotificationType, NotificationPriority,
    NotificationChannel, UserRole, PushToken
)
from sqlalchemy import func
import logging
import uuid

notification_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')
notification_engine = SmartNotificationEngine()

logger = logging.getLogger(__name__)

# ============ DATABASE MODELS ============

from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean, JSON, Text
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class DeviceToken(db.Model):
    """رموز أجهزة الإشعارات"""
    __tablename__ = 'device_tokens'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False)
    device_type = Column(String(50), nullable=False)  # ios, android, web
    token = Column(String(500), unique=True, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used = Column(DateTime)
    
    INDEX_user = ('user_id',)

class NotificationRecord(db.Model):
    """سجل الإشعارات المرسلة"""
    __tablename__ = 'notification_records'
    
    id = Column(Integer, primary_key=True)
    notification_id = Column(String(100), unique=True, nullable=False)
    user_id = Column(Integer, nullable=False)
    notification_type = Column(String(50), nullable=False)
    priority = Column(String(20), nullable=False)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    channels_sent = Column(JSON)  # ['fcm', 'sms']
    status = Column(String(50), default='sent')  # sent, delivered, clicked, failed
    sent_at = Column(DateTime, default=datetime.utcnow)
    delivered_at = Column(DateTime)
    clicked_at = Column(DateTime)
    order_id = Column(Integer)
    related_data = Column(JSON)
    
    INDEX_user = ('user_id',)
    INDEX_type = ('notification_type',)
    INDEX_sent_at = ('sent_at',)

class UserNotificationPreference(db.Model):
    """تفضيلات الإشعارات للمستخدم"""
    __tablename__ = 'user_notification_preferences'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, unique=True, nullable=False)
    push_enabled = Column(Boolean, default=True)
    sms_enabled = Column(Boolean, default=True)
    email_enabled = Column(Boolean, default=True)
    quiet_hours_enabled = Column(Boolean, default=True)
    quiet_hours_start = Column(Integer, default=22)  # 10 PM
    quiet_hours_end = Column(Integer, default=8)     # 8 AM
    notification_preferences = Column(JSON)  # نوع الإشعارات المفعلة
    updated_at = Column(DateTime, default=datetime.utcnow)

class NotificationCampaign(db.Model):
    """حملات الإشعارات (الترويج والعروضات)"""
    __tablename__ = 'notification_campaigns'
    
    id = Column(Integer, primary_key=True)
    campaign_id = Column(String(100), unique=True, nullable=False)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    target_users = Column(Integer)  # عدد المستخدمين المستهدفين
    sent_count = Column(Integer, default=0)
    delivered_count = Column(Integer, default=0)
    clicked_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    scheduled_at = Column(DateTime)
    completed_at = Column(DateTime)
    status = Column(String(50), default='draft')  # draft, scheduled, sent, completed

# ============ FLASK ROUTES ============

@notification_bp.route('/register-device', methods=['POST'])
def register_device():
    """
    سجّل جهاز جديد للإشعارات
    
    Request JSON:
    {
        "user_id": 123,
        "device_type": "android",
        "device_token": "c7N_xBq6KCM:APA91bFq1zC..."
    }
    """
    try:
        data = request.get_json()
        
        required = ['user_id', 'device_type', 'device_token']
        if not all(field in data for field in required):
            return jsonify({"error": "Missing required fields"}), 400
        
        # تحقق من وجود الجهاز
        existing = db.session.query(DeviceToken).filter_by(
            token=data['device_token']
        ).first()
        
        if existing:
            existing.is_active = True
            existing.last_used = datetime.utcnow()
        else:
            # أضف جهاز جديد
            device = DeviceToken(
                user_id=data['user_id'],
                device_type=data['device_type'],
                token=data['device_token'],
                is_active=True
            )
            db.session.add(device)
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Device registered successfully"
        }), 200
        
    except Exception as e:
        logger.error(f"Error registering device: {str(e)}")
        return jsonify({"error": str(e)}), 500

@notification_bp.route('/send-order-notification', methods=['POST'])
def send_order_notification():
    """
    أرسل إشعار متعلق بالطلب
    
    Request JSON:
    {
        "order_id": 1001,
        "user_id": 123,
        "user_role": "customer",
        "notification_type": "driver_assigned",
        "priority": "high",
        "context": {
            "driver_name": "Ahmed Ali",
            "rating": 4.8
        }
    }
    """
    try:
        data = request.get_json()
        
        required = ['order_id', 'user_id', 'user_role', 'notification_type']
        if not all(field in data for field in required):
            return jsonify({"error": "Missing required fields"}), 400
        
        # حول النصوص إلى Enums
        try:
            notification_type = NotificationType[data['notification_type'].upper()]
            user_role = UserRole[data['user_role'].upper()]
            priority = NotificationPriority[data.get('priority', 'NORMAL').upper()]
        except KeyError:
            return jsonify({"error": "Invalid enum value"}), 400
        
        # أرسل الإشعار
        success = notification_engine.send_order_notification(
            order_id=data['order_id'],
            user_id=data['user_id'],
            user_role=user_role,
            notification_type=notification_type,
            context_data=data.get('context', {}),
            priority=priority
        )
        
        # سجل الإشعار في قاعدة البيانات
        notification_record = NotificationRecord(
            notification_id=str(uuid.uuid4()),
            user_id=data['user_id'],
            notification_type=notification_type.value,
            priority=priority.name,
            title=data.get('title', ''),
            body=data.get('body', ''),
            channels_sent=['fcm', 'sms'],
            order_id=data['order_id'],
            related_data=data.get('context', {})
        )
        db.session.add(notification_record)
        db.session.commit()
        
        return jsonify({
            "success": success,
            "message": "Notification sent" if success else "Failed to send notification"
        }), 200 if success else 500
        
    except Exception as e:
        logger.error(f"Error sending notification: {str(e)}")
        return jsonify({"error": str(e)}), 500

@notification_bp.route('/user-preferences/<int:user_id>', methods=['GET'])
def get_user_preferences(user_id):
    """
    احصل على تفضيلات الإشعارات للمستخدم
    """
    try:
        prefs = db.session.query(UserNotificationPreference).filter_by(
            user_id=user_id
        ).first()
        
        if not prefs:
            # أنشئ تفضيلات افتراضية
            prefs = UserNotificationPreference(user_id=user_id)
            db.session.add(prefs)
            db.session.commit()
        
        return jsonify({
            "success": True,
            "preferences": {
                "push_enabled": prefs.push_enabled,
                "sms_enabled": prefs.sms_enabled,
                "email_enabled": prefs.email_enabled,
                "quiet_hours_enabled": prefs.quiet_hours_enabled,
                "quiet_hours_start": prefs.quiet_hours_start,
                "quiet_hours_end": prefs.quiet_hours_end,
                "notification_preferences": prefs.notification_preferences
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting preferences: {str(e)}")
        return jsonify({"error": str(e)}), 500

@notification_bp.route('/user-preferences/<int:user_id>', methods=['PUT'])
def update_user_preferences(user_id):
    """
    حدّث تفضيلات الإشعارات للمستخدم
    """
    try:
        data = request.get_json()
        
        prefs = db.session.query(UserNotificationPreference).filter_by(
            user_id=user_id
        ).first()
        
        if not prefs:
            prefs = UserNotificationPreference(user_id=user_id)
            db.session.add(prefs)
        
        # حدّث التفضيلات
        if 'push_enabled' in data:
            prefs.push_enabled = data['push_enabled']
        if 'sms_enabled' in data:
            prefs.sms_enabled = data['sms_enabled']
        if 'email_enabled' in data:
            prefs.email_enabled = data['email_enabled']
        if 'quiet_hours_enabled' in data:
            prefs.quiet_hours_enabled = data['quiet_hours_enabled']
        if 'quiet_hours_start' in data:
            prefs.quiet_hours_start = data['quiet_hours_start']
        if 'quiet_hours_end' in data:
            prefs.quiet_hours_end = data['quiet_hours_end']
        if 'notification_preferences' in data:
            prefs.notification_preferences = data['notification_preferences']
        
        prefs.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Preferences updated"
        }), 200
        
    except Exception as e:
        logger.error(f"Error updating preferences: {str(e)}")
        return jsonify({"error": str(e)}), 500

@notification_bp.route('/history/<int:user_id>', methods=['GET'])
def get_notification_history(user_id):
    """
    احصل على سجل الإشعارات للمستخدم
    """
    try:
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        records = db.session.query(NotificationRecord).filter_by(
            user_id=user_id
        ).order_by(
            NotificationRecord.sent_at.desc()
        ).limit(limit).offset(offset).all()
        
        return jsonify({
            "success": True,
            "total": db.session.query(func.count(NotificationRecord.id)).filter_by(
                user_id=user_id
            ).scalar(),
            "notifications": [
                {
                    "notification_id": r.notification_id,
                    "type": r.notification_type,
                    "title": r.title,
                    "body": r.body,
                    "status": r.status,
                    "sent_at": r.sent_at.isoformat(),
                    "clicked": r.clicked_at is not None
                }
                for r in records
            ]
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting history: {str(e)}")
        return jsonify({"error": str(e)}), 500

@notification_bp.route('/mark-delivered', methods=['POST'])
def mark_notification_delivered():
    """
    ضع علامة على الإشعار كـ "تم الوصول"
    """
    try:
        data = request.get_json()
        
        if 'notification_id' not in data:
            return jsonify({"error": "Missing notification_id"}), 400
        
        record = db.session.query(NotificationRecord).filter_by(
            notification_id=data['notification_id']
        ).first()
        
        if record:
            record.status = 'delivered'
            record.delivered_at = datetime.utcnow()
            db.session.commit()
        
        return jsonify({"success": True}), 200
        
    except Exception as e:
        logger.error(f"Error marking delivered: {str(e)}")
        return jsonify({"error": str(e)}), 500

@notification_bp.route('/mark-clicked', methods=['POST'])
def mark_notification_clicked():
    """
    ضع علامة على الإشعار كـ "تم النقر عليه"
    """
    try:
        data = request.get_json()
        
        if 'notification_id' not in data:
            return jsonify({"error": "Missing notification_id"}), 400
        
        record = db.session.query(NotificationRecord).filter_by(
            notification_id=data['notification_id']
        ).first()
        
        if record:
            record.status = 'clicked'
            record.clicked_at = datetime.utcnow()
            db.session.commit()
        
        return jsonify({"success": True}), 200
        
    except Exception as e:
        logger.error(f"Error marking clicked: {str(e)}")
        return jsonify({"error": str(e)}), 500

@notification_bp.route('/analytics', methods=['GET'])
def get_notification_analytics():
    """
    احصل على تحليلات الإشعارات
    """
    try:
        days = request.args.get('days', 7, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)
        
        total_sent = db.session.query(func.count(NotificationRecord.id)).filter(
            NotificationRecord.sent_at >= start_date
        ).scalar()
        
        delivered = db.session.query(func.count(NotificationRecord.id)).filter(
            NotificationRecord.status == 'delivered',
            NotificationRecord.sent_at >= start_date
        ).scalar()
        
        clicked = db.session.query(func.count(NotificationRecord.id)).filter(
            NotificationRecord.status == 'clicked',
            NotificationRecord.sent_at >= start_date
        ).scalar()
        
        failed = db.session.query(func.count(NotificationRecord.id)).filter(
            NotificationRecord.status == 'failed',
            NotificationRecord.sent_at >= start_date
        ).scalar()
        
        return jsonify({
            "success": True,
            "period_days": days,
            "total_sent": total_sent,
            "delivered": delivered,
            "clicked": clicked,
            "failed": failed,
            "delivery_rate": round((delivered / total_sent * 100) if total_sent > 0 else 0, 2),
            "click_through_rate": round((clicked / delivered * 100) if delivered > 0 else 0, 2),
            "failure_rate": round((failed / total_sent * 100) if total_sent > 0 else 0, 2)
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting analytics: {str(e)}")
        return jsonify({"error": str(e)}), 500

@notification_bp.route('/campaigns', methods=['GET'])
def get_campaigns():
    """
    احصل على قائمة الحملات
    """
    try:
        campaigns = db.session.query(NotificationCampaign).order_by(
            NotificationCampaign.created_at.desc()
        ).all()
        
        return jsonify({
            "success": True,
            "campaigns": [
                {
                    "campaign_id": c.campaign_id,
                    "title": c.title,
                    "body": c.body,
                    "status": c.status,
                    "target_users": c.target_users,
                    "sent_count": c.sent_count,
                    "delivered_count": c.delivered_count,
                    "clicked_count": c.clicked_count,
                    "created_at": c.created_at.isoformat()
                }
                for c in campaigns
            ]
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting campaigns: {str(e)}")
        return jsonify({"error": str(e)}), 500

@notification_bp.route('/campaigns', methods=['POST'])
def create_campaign():
    """
    أنشئ حملة إشعارات جديدة
    """
    try:
        data = request.get_json()
        
        required = ['title', 'body', 'target_users']
        if not all(field in data for field in required):
            return jsonify({"error": "Missing required fields"}), 400
        
        campaign = NotificationCampaign(
            campaign_id=str(uuid.uuid4()),
            title=data['title'],
            body=data['body'],
            target_users=data['target_users'],
            status=data.get('status', 'draft'),
            scheduled_at=datetime.fromisoformat(data['scheduled_at']) if 'scheduled_at' in data else None
        )
        
        db.session.add(campaign)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "campaign_id": campaign.campaign_id
        }), 201
        
    except Exception as e:
        logger.error(f"Error creating campaign: {str(e)}")
        return jsonify({"error": str(e)}), 500
