"""
Enterprise Compliance Infrastructure Models
Tracks policy versions, user acceptance, and immutable audit logs.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Text, DateTime, ForeignKey, JSON, Index
from database.schemas import Base

UTC = timezone.utc

def _uuid(): return str(uuid.uuid4())
def _now(): return datetime.now(UTC)


class LegalPolicyVersion(Base):
    """Stores versions and snapshots of legal policies."""
    __tablename__ = 'legal_policy_versions'

    id              = Column(String(36), primary_key=True, default=_uuid)
    policy_key      = Column(String(100), nullable=False, index=True) # e.g., 'driver_agreement', 'privacy_policy'
    version         = Column(String(20), nullable=False)
    title           = Column(String(255), nullable=False)
    published_at    = Column(DateTime(timezone=True), default=_now, nullable=False)
    active          = Column(Boolean, default=False, nullable=False)
    checksum_hash   = Column(String(64), nullable=False)
    policy_snapshot = Column(Text, nullable=False) # The actual content
    created_at      = Column(DateTime(timezone=True), default=_now, nullable=False)

    __table_args__ = (
        Index('ix_policy_key_active', 'policy_key', 'active'),
    )

    def __repr__(self):
        return f'<LegalPolicyVersion {self.policy_key} v{self.version}>'


class UserLegalAcceptance(Base):
    """Immutable record of a user accepting a legal policy."""
    __tablename__ = 'user_legal_acceptances'

    id                = Column(String(36), primary_key=True, default=_uuid)
    user_id           = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    role              = Column(String(50), nullable=False) # customer, driver, restaurant, admin
    policy_key        = Column(String(100), nullable=False)
    policy_version    = Column(String(20), nullable=False)
    accepted          = Column(Boolean, default=False, nullable=False)
    accepted_at       = Column(DateTime(timezone=True), default=_now, nullable=False)
    accepted_ip       = Column(String(45))
    user_agent        = Column(Text)
    device_metadata   = Column(JSON)
    acceptance_source = Column(String(100)) # e.g., 'web_onboarding', 'mobile_app'
    acceptance_method = Column(String(100)) # e.g., 'clickwrap_scroll_bottom'
    geo_metadata      = Column(JSON)
    risk_flags        = Column(JSON) # Array of strings like 'fast_scroll'
    signature_hash    = Column(String(255))

    __table_args__ = (
        Index('ix_user_policy', 'user_id', 'policy_key'),
    )

    def __repr__(self):
        return f'<UserLegalAcceptance {self.user_id} {self.policy_key} v{self.policy_version}>'


class ComplianceAuditLog(Base):
    """Immutable audit trail for all legal/compliance events."""
    __tablename__ = 'compliance_audit_logs'

    id            = Column(String(36), primary_key=True, default=_uuid)
    actor_id      = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    actor_role    = Column(String(50))
    event_type    = Column(String(100), nullable=False, index=True) # e.g., 'policy.accepted', 'sms.opt_out'
    event_payload = Column(JSON, nullable=False)
    ip_address    = Column(String(45))
    user_agent    = Column(Text)
    correlation_id= Column(String(100))
    created_at    = Column(DateTime(timezone=True), default=_now, nullable=False)

    __table_args__ = (
        Index('ix_compliance_logs_created', 'created_at'),
    )

    def __repr__(self):
        return f'<ComplianceAuditLog {self.event_type} by {self.actor_id}>'

# Maintain backward compatibility with the old RestaurantLegalAcceptance for now if needed,
# or we can migrate its data. For now, we will leave the old one here to avoid breaking imports immediately.
class RestaurantLegalAcceptance(Base):
    __tablename__ = 'restaurant_legal_acceptances'
    id                  = Column(String(36), primary_key=True, default=_uuid)
    restaurant_id       = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    accepted_terms      = Column(Boolean, default=False, nullable=False)
    accepted_privacy    = Column(Boolean, default=False, nullable=False)
    accepted_wap_ai_terms = Column(Boolean, default=False, nullable=False)
    ip_address          = Column(String(45))
    user_agent          = Column(Text)
    policy_version      = Column(String(20), default='1.0.0', nullable=False)
    accepted_at         = Column(DateTime(timezone=True), default=_now, nullable=False)
    created_at          = Column(DateTime(timezone=True), default=_now, nullable=False)
