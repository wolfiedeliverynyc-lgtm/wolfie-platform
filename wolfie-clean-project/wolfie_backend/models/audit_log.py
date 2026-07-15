"""
Restaurant Audit Log Model
Compliance and security event logging
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON, Index
from database.schemas import Base

UTC = timezone.utc

def _uuid(): return str(uuid.uuid4())
def _now(): return datetime.now(UTC)


class RestaurantAuditLog(Base):
    """Immutable compliance audit trail."""
    __tablename__ = 'restaurant_audit_logs'
    
    id            = Column(String(36), primary_key=True, default=_uuid)
    restaurant_id = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    actor_id      = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    actor_role    = Column(String(50))
    action        = Column(String(100), nullable=False)  # e.g. legal_accepted, payout_created, ai_activated
    target_type   = Column(String(50))  # e.g. payout_account, ai_subscription, legal_acceptance
    target_id     = Column(String(36))
    old_values    = Column(JSON)
    new_values    = Column(JSON)
    ip_address    = Column(String(45))
    user_agent    = Column(Text)
    created_at    = Column(DateTime(timezone=True), default=_now, nullable=False)
    
    __table_args__ = (
        Index('ix_audit_logs_restaurant_action', 'restaurant_id', 'action'),
        Index('ix_audit_logs_created', 'created_at'),
    )
    
    def __repr__(self):
        return f'<RestaurantAuditLog {self.action} by {self.actor_id}>'
