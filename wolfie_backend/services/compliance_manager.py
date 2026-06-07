"""
Enterprise Compliance Manager
Handles compliance state machine, event bus, and policy enforcement.
"""
import json
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from database.schemas import User
from models.legal_acceptance import LegalPolicyVersion, UserLegalAcceptance, ComplianceAuditLog

UTC = timezone.utc
logger = logging.getLogger("wolfie.compliance")

class ComplianceEventBus:
    """Simple synchronous event bus for compliance events.
    In a fully distributed system, this would publish to Kafka/Redis.
    """
    _listeners = {}

    @classmethod
    def subscribe(cls, event_type: str, callback: callable):
        if event_type not in cls._listeners:
            cls._listeners[event_type] = []
        cls._listeners[event_type].append(callback)

    @classmethod
    def publish(cls, event_type: str, payload: dict):
        logger.info(f"[COMPLIANCE EVENT] {event_type}: {payload}")
        for callback in cls._listeners.get(event_type, []):
            try:
                callback(payload)
            except Exception as e:
                logger.error(f"Error in compliance listener for {event_type}: {e}")

class ComplianceManager:
    """Manages user compliance states and policy enforcement."""
    
    REQUIRED_POLICIES = {
        "customer": ["terms_of_service", "privacy_policy"],
        "driver": ["terms_of_service", "privacy_policy", "driver_agreement"],
        "restaurant": ["terms_of_service", "privacy_policy", "merchant_agreement"],
        "admin": []
    }

    def __init__(self, session: Session):
        self.session = session

    def get_required_policies(self, role: str) -> list[str]:
        return self.REQUIRED_POLICIES.get(role, [])

    def get_active_versions(self, policy_keys: list[str]) -> dict[str, LegalPolicyVersion]:
        """Returns the currently active versions of the requested policies."""
        if not policy_keys:
            return {}
        versions = self.session.query(LegalPolicyVersion).filter(
            LegalPolicyVersion.policy_key.in_(policy_keys),
            LegalPolicyVersion.active == True
        ).all()
        return {v.policy_key: v for v in versions}

    def evaluate_user_compliance(self, user_id: str, role: str) -> str:
        """
        Compliance State Machine:
        - `compliant`: User has accepted all required active policies.
        - `update_required`: User is missing acceptance for one or more active policies.
        - `suspended_due_to_compliance`: User has critical risk flags or explicitly rejected policies.
        """
        required_keys = self.get_required_policies(role)
        if not required_keys:
            return "compliant"

        active_policies = self.get_active_versions(required_keys)
        
        acceptances = self.session.query(UserLegalAcceptance).filter(
            UserLegalAcceptance.user_id == user_id,
            UserLegalAcceptance.policy_key.in_(required_keys)
        ).all()
        
        acceptance_map = {a.policy_key: a for a in acceptances}

        for key in required_keys:
            active_policy = active_policies.get(key)
            if not active_policy:
                # If there's no active policy defined in the system yet, skip enforcement for it
                continue
            
            user_acceptance = acceptance_map.get(key)
            if not user_acceptance:
                return "update_required"
            
            if user_acceptance.policy_version != active_policy.version:
                return "update_required"
                
            if not user_acceptance.accepted:
                return "suspended_due_to_compliance"

        return "compliant"

    def record_acceptance(self, user_id: str, role: str, policy_key: str, 
                          ip_address: str, user_agent: str, method: str, geo: dict = None):
        """Records a user's acceptance of the currently active policy version."""
        active_policy = self.get_active_versions([policy_key]).get(policy_key)
        if not active_policy:
            raise ValueError(f"No active policy found for {policy_key}")

        # Check for existing to avoid duplicates of the same version
        existing = self.session.query(UserLegalAcceptance).filter_by(
            user_id=user_id, policy_key=policy_key, policy_version=active_policy.version
        ).first()
        
        if existing:
            return existing

        acceptance = UserLegalAcceptance(
            user_id=user_id,
            role=role,
            policy_key=policy_key,
            policy_version=active_policy.version,
            accepted=True,
            accepted_ip=ip_address,
            user_agent=user_agent,
            acceptance_method=method,
            geo_metadata=geo
        )
        self.session.add(acceptance)
        
        # Log to immutable audit trail
        audit_log = ComplianceAuditLog(
            actor_id=user_id,
            actor_role=role,
            event_type="policy.accepted",
            event_payload={
                "policy_key": policy_key,
                "version": active_policy.version,
                "method": method
            },
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.session.add(audit_log)
        
        ComplianceEventBus.publish("policy.accepted", {
            "user_id": user_id,
            "role": role,
            "policy_key": policy_key,
            "version": active_policy.version
        })
        
        return acceptance

    def get_pending_policies(self, user_id: str, role: str) -> list[dict]:
        """Returns a list of policies the user needs to accept."""
        required_keys = self.get_required_policies(role)
        if not required_keys:
            return []

        active_policies = self.get_active_versions(required_keys)
        acceptances = self.session.query(UserLegalAcceptance).filter(
            UserLegalAcceptance.user_id == user_id,
            UserLegalAcceptance.policy_key.in_(required_keys)
        ).all()
        acceptance_map = {a.policy_key: a for a in acceptances}

        pending = []
        for key in required_keys:
            active = active_policies.get(key)
            if not active: continue
            
            user_acc = acceptance_map.get(key)
            if not user_acc or user_acc.policy_version != active.version:
                pending.append({
                    "policy_key": active.policy_key,
                    "title": active.title,
                    "version": active.version,
                    "published_at": active.published_at.isoformat(),
                    "content": active.policy_snapshot # Sending snapshot to frontend for display
                })
        return pending
