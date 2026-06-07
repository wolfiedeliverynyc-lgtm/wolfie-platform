"""
WAP AI Service Activation Engine
Manages AI subscription tiers, feature activation, and usage tracking
"""
import logging
from datetime import datetime, timezone
from database import transaction, get_db_session
from models.ai_subscription import RestaurantAISubscription, AI_PLAN_LIMITS
from models.audit_log import RestaurantAuditLog

logger = logging.getLogger('wolfie.wap_service')
UTC = timezone.utc


class WAPActivationService:
    """Manages WAP AI subscription lifecycle."""
    
    PLAN_NAMES = {
        'free':       'Free',
        'pro':        'Pro AI',
        'enterprise': 'Enterprise AI',
    }
    
    PLAN_MONTHLY_PRICES = {
        'free':       0.00,
        'pro':        79.00,
        'enterprise': 299.00,
    }
    
    def get_or_create_subscription(self, session, restaurant_id: str) -> RestaurantAISubscription:
        """Get existing subscription or create a free one."""
        sub = session.query(RestaurantAISubscription).filter_by(
            restaurant_id=restaurant_id
        ).first()
        
        if not sub:
            import uuid
            now = datetime.now(UTC)
            sub = RestaurantAISubscription(
                id=str(uuid.uuid4()),
                restaurant_id=restaurant_id,
                ai_enabled=False,
                ai_plan='free',
                ai_usage=self._empty_usage(),
                ai_limits=AI_PLAN_LIMITS['free'],
                ai_billing_status='none',
                billing_cycle_start=now,
                created_at=now,
                updated_at=now,
            )
            session.add(sub)
        
        return sub
    
    def activate_plan(self, session, restaurant_id: str, plan: str,
                      actor_id: str = None, ip_address: str = None) -> RestaurantAISubscription:
        """Activate or upgrade WAP AI plan."""
        if plan not in AI_PLAN_LIMITS:
            raise ValueError(f'Invalid plan: {plan}. Must be one of {list(AI_PLAN_LIMITS.keys())}')
        
        sub = self.get_or_create_subscription(session, restaurant_id)
        old_plan = sub.ai_plan
        
        sub.ai_plan = plan
        sub.ai_enabled = True
        sub.ai_limits = AI_PLAN_LIMITS[plan]
        sub.ai_billing_status = 'active' if plan != 'free' else 'none'
        sub.updated_at = datetime.now(UTC)
        
        # Reset usage on plan change
        if old_plan != plan:
            sub.ai_usage = self._empty_usage()
            sub.billing_cycle_start = datetime.now(UTC)
        
        # Audit log
        self._audit(session, restaurant_id, actor_id, 'ai_plan_activated',
                    'ai_subscription', sub.id,
                    old_values={'plan': old_plan},
                    new_values={'plan': plan},
                    ip_address=ip_address)
        
        logger.info(f'WAP AI activated for restaurant {restaurant_id}: {old_plan} → {plan}')
        return sub
    
    def increment_usage(self, session, restaurant_id: str, feature: str, count: int = 1) -> bool:
        """Track AI feature usage. Returns False if limit exceeded."""
        sub = self.get_or_create_subscription(session, restaurant_id)
        
        if not sub.ai_enabled:
            return False
        
        usage = sub.ai_usage or self._empty_usage()
        limits = sub.ai_limits or AI_PLAN_LIMITS.get(sub.ai_plan, AI_PLAN_LIMITS['free'])
        
        limit = limits.get(feature, 0)
        current = usage.get(feature, 0)
        
        # -1 means unlimited (enterprise)
        if limit != -1 and current + count > limit:
            logger.warning(f'WAP usage limit exceeded: restaurant={restaurant_id} feature={feature}')
            return False
        
        usage[feature] = current + count
        sub.ai_usage = usage
        sub.updated_at = datetime.now(UTC)
        return True
    
    def get_usage_summary(self, session, restaurant_id: str) -> dict:
        """Return full usage summary with percentages."""
        sub = self.get_or_create_subscription(session, restaurant_id)
        usage = sub.ai_usage or self._empty_usage()
        limits = sub.ai_limits or AI_PLAN_LIMITS.get(sub.ai_plan, AI_PLAN_LIMITS['free'])
        
        summary = {}
        for feature, limit in limits.items():
            current = usage.get(feature, 0)
            if limit == -1:
                pct = 0
            elif limit == 0:
                pct = 100 if current > 0 else 0
            else:
                pct = min(100, round((current / limit) * 100, 1))
            summary[feature] = {
                'used': current,
                'limit': limit,
                'percentage': pct,
                'unlimited': limit == -1,
            }
        return summary
    
    def get_subscription_info(self, session, restaurant_id: str) -> dict:
        """Return subscription details for API response."""
        sub = self.get_or_create_subscription(session, restaurant_id)
        return {
            'ai_enabled': sub.ai_enabled,
            'ai_plan': sub.ai_plan,
            'plan_name': self.PLAN_NAMES.get(sub.ai_plan, sub.ai_plan),
            'monthly_price': self.PLAN_MONTHLY_PRICES.get(sub.ai_plan, 0),
            'ai_billing_status': sub.ai_billing_status,
            'billing_cycle_start': sub.billing_cycle_start.isoformat() if sub.billing_cycle_start else None,
            'usage': self.get_usage_summary(session, restaurant_id),
            'features': {
                'ai_menu_generation': sub.ai_plan in ('pro', 'enterprise'),
                'ai_analytics': sub.ai_enabled,
                'ai_recommendations': sub.ai_plan in ('pro', 'enterprise'),
                'ai_demand_prediction': sub.ai_plan in ('pro', 'enterprise'),
                'ai_auto_promotions': sub.ai_plan == 'enterprise',
            },
        }
    
    def _empty_usage(self) -> dict:
        return {
            'menu_generation_monthly': 0,
            'analytics_requests_monthly': 0,
            'promotion_generations_monthly': 0,
            'demand_predictions_monthly': 0,
            'auto_promotions_monthly': 0,
        }
    
    def _audit(self, session, restaurant_id, actor_id, action, target_type,
               target_id, old_values=None, new_values=None, ip_address=None):
        import uuid
        log = RestaurantAuditLog(
            id=str(uuid.uuid4()),
            restaurant_id=restaurant_id,
            actor_id=actor_id or restaurant_id,
            actor_role='restaurant',
            action=action,
            target_type=target_type,
            target_id=target_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            created_at=datetime.now(UTC),
        )
        session.add(log)


# Singleton
wap_activation_service = WAPActivationService()
