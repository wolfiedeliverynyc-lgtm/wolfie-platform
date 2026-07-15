"""
Restaurant AI Subscription Model
Tracks WAP AI plan, usage, and limits per restaurant
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, JSON
from database.schemas import Base

UTC = timezone.utc

def _uuid(): return str(uuid.uuid4())
def _now(): return datetime.now(UTC)

AI_PLAN_LIMITS = {
    'free': {
        'menu_generation_monthly': 10,
        'analytics_requests_monthly': 50,
        'promotion_generations_monthly': 5,
        'demand_predictions_monthly': 20,
        'auto_promotions_monthly': 0,
    },
    'pro': {
        'menu_generation_monthly': 200,
        'analytics_requests_monthly': 1000,
        'promotion_generations_monthly': 100,
        'demand_predictions_monthly': 500,
        'auto_promotions_monthly': 50,
    },
    'enterprise': {
        'menu_generation_monthly': -1,  # unlimited
        'analytics_requests_monthly': -1,
        'promotion_generations_monthly': -1,
        'demand_predictions_monthly': -1,
        'auto_promotions_monthly': -1,
    },
}


class RestaurantAISubscription(Base):
    """WAP AI subscription details per restaurant."""
    __tablename__ = 'restaurant_ai_subscriptions'
    
    id                = Column(String(36), primary_key=True, default=_uuid)
    restaurant_id     = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    ai_enabled        = Column(Boolean, default=False, nullable=False)
    ai_plan           = Column(String(20), default='free', nullable=False)  # free, pro, enterprise
    ai_usage          = Column(JSON, default=dict)   # current month usage counters
    ai_limits         = Column(JSON, default=dict)   # plan limits (denormalized)
    ai_billing_status = Column(String(20), default='none')  # none, active, past_due, cancelled
    billing_cycle_start = Column(DateTime(timezone=True))
    created_at        = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at        = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)
    
    def get_limits(self) -> dict:
        return self.ai_limits or AI_PLAN_LIMITS.get(self.ai_plan, AI_PLAN_LIMITS['free'])
    
    def get_usage(self) -> dict:
        return self.ai_usage or {}
    
    def __repr__(self):
        return f'<RestaurantAISubscription {self.restaurant_id} [{self.ai_plan}] enabled={self.ai_enabled}>'
