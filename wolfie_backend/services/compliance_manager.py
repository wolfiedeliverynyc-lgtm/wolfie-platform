"""
Enterprise Compliance Manager
Handles compliance state machine, event bus, and localized policy enforcement.
"""
import json
import logging
import re
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from database.schemas import User
from models.legal_acceptance import LegalPolicyVersion, UserLegalAcceptance, ComplianceAuditLog
from services.audit_logger import get_request_id

UTC = timezone.utc
logger = logging.getLogger("wolfie.compliance")


# ══════════════════════════════════════════════════════════════════════════════
# COMPLIANCE EVENT BUS
# ══════════════════════════════════════════════════════════════════════════════

class ComplianceEventBus:
    """Simple synchronous event bus for compliance events."""
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


# ══════════════════════════════════════════════════════════════════════════════
# COMPLIANCE MANAGER
# ══════════════════════════════════════════════════════════════════════════════

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

    def get_active_versions(self, policy_keys: list[str], market: str = "GLOBAL") -> dict[str, LegalPolicyVersion]:
        """
        Returns the currently active versions of the requested policies.
        Supports market-level overrides: if a specific market version exists and is active,
        it takes precedence over the "GLOBAL" fallback policy.
        """
        if not policy_keys:
            return {}

        market = (market or "GLOBAL").strip().upper()

        versions = self.session.query(LegalPolicyVersion).filter(
            LegalPolicyVersion.policy_key.in_(policy_keys),
            LegalPolicyVersion.active == True,
            LegalPolicyVersion.market.in_([market, "GLOBAL"])
        ).all()

        # Group and resolve priority: specific market version takes precedence over GLOBAL
        resolved = {}
        for v in versions:
            existing = resolved.get(v.policy_key)
            if not existing:
                resolved[v.policy_key] = v
            else:
                # Override if existing is GLOBAL and current is market-specific
                if existing.market == "GLOBAL" and v.market == market:
                    resolved[v.policy_key] = v

        return resolved

    def evaluate_user_compliance(self, user_id: str, role: str, market: str = "GLOBAL") -> str:
        """
        Compliance State Machine:
        - `compliant`: User has accepted all required active policies.
        - `update_required`: User is missing acceptance for one or more active policies.
        - `suspended_due_to_compliance`: User has critical risk flags or explicitly rejected policies.
        """
        required_keys = self.get_required_policies(role)
        if not required_keys:
            return "compliant"

        active_policies = self.get_active_versions(required_keys, market=market)
        
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
                          ip_address: str, user_agent: str, method: str, 
                          geo: dict = None, market: str = "GLOBAL"):
        """Records a user's acceptance of the currently active policy version."""
        market = (market or "GLOBAL").strip().upper()
        active_policy = self.get_active_versions([policy_key], market=market).get(policy_key)
        if not active_policy:
            raise ValueError(f"No active policy found for {policy_key} in market {market}")

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
        
        # Read correlation ID (Request ID) from Flask request lifecycle if available
        correlation_id = get_request_id()

        # Log to immutable compliance audit trail with complete metadata payload
        audit_log = ComplianceAuditLog(
            actor_id=user_id,
            actor_role=role,
            event_type="policy.accepted",
            event_payload={
                "policy_key": policy_key,
                "version": active_policy.version,
                "method": method,
                "market": market,
                "geo_metadata": geo or {}
            },
            ip_address=ip_address,
            user_agent=user_agent,
            correlation_id=correlation_id
        )
        self.session.add(audit_log)
        
        ComplianceEventBus.publish("policy.accepted", {
            "user_id": user_id,
            "role": role,
            "policy_key": policy_key,
            "version": active_policy.version,
            "market": market,
            "correlation_id": correlation_id
        })
        
        return acceptance

    def get_pending_policies(self, user_id: str, role: str, market: str = "GLOBAL") -> list[dict]:
        """Returns a list of policies the user needs to accept."""
        required_keys = self.get_required_policies(role)
        if not required_keys:
            return []

        active_policies = self.get_active_versions(required_keys, market=market)
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
                    "market": active.market,
                    "published_at": active.published_at.isoformat(),
                    "content": active.policy_snapshot # Sending snapshot to frontend for display
                })
        return pending

    # ── Re-agreement & Versioning Management ──────────────────────────────

    def publish_new_policy_version(self, policy_key: str, version: str, title: str, 
                                   content: str, checksum_hash: str, market: str = "GLOBAL") -> LegalPolicyVersion:
        """
        Publishes a new legal policy version.
        Supports Semantic Versioning checks (e.g. 1.0.0, 1.1.0).
        Automatically deactivates the previous active version for the same key and market,
        forcing users to accept the new version on their next compliance check.
        """
        # Validate Semantic Version string (Observation 1)
        if not re.match(r"^\d+\.\d+(\.\d+)?$", version):
            raise ValueError(f"Invalid version format '{version}'. Must follow Semantic Versioning (e.g., 1.0.0, 2.1).")

        market = (market or "GLOBAL").strip().upper()

        # Deactivate any currently active policy version for the same key and market
        existing_active = self.session.query(LegalPolicyVersion).filter_by(
            policy_key=policy_key,
            market=market,
            active=True
        ).all()

        for old_policy in existing_active:
            old_policy.active = False
            logger.info(f"Deactivated old policy version: {old_policy.policy_key} v{old_policy.version} in market {market}")

        # Create new active policy version
        new_policy = LegalPolicyVersion(
            policy_key=policy_key,
            version=version,
            title=title,
            policy_snapshot=content,
            checksum_hash=checksum_hash,
            market=market,
            active=True,
            published_at=datetime.now(UTC)
        )
        self.session.add(new_policy)
        
        # Log to compliance audit log
        correlation_id = get_request_id()
        audit_log = ComplianceAuditLog(
            actor_id="system",
            actor_role="system",
            event_type="policy.version_published",
            event_payload={
                "policy_key": policy_key,
                "version": version,
                "market": market,
                "title": title
            },
            correlation_id=correlation_id
        )
        self.session.add(audit_log)

        ComplianceEventBus.publish("policy.version_published", {
            "policy_key": policy_key,
            "version": version,
            "market": market,
            "correlation_id": correlation_id
        })

        logger.info(f"Published and activated new policy version: {policy_key} v{version} in market {market} ✅")
        return new_policy
