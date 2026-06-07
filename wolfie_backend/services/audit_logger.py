"""
Audit Logger Service
Handles logging of all admin and operational actions for security and compliance.
"""

from database.schemas import SupportLog
from datetime import datetime, timezone

def log_admin_action(session, actor_id, actor_role, action, target_type, target_id, metadata=None, ip_address=None):
    """
    Logs an action performed by an admin or system into the support_logs table.
    Must be called within an active database session.
    """
    log_entry = SupportLog(
        actor_id=actor_id,
        actor_role=actor_role,
        action=action,
        target_type=target_type,
        target_id=target_id,
        meta_data=metadata or {},
        ip_address=ip_address,
        created_at=datetime.now(timezone.utc)
    )
    session.add(log_entry)
    # Note: We do not call session.commit() here to allow the caller to group this 
    # log with the actual transaction they are performing.
    return log_entry
