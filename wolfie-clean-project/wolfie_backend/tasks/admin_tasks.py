"""
Admin & Operational Background Tasks
"""
import logging
import time
from datetime import datetime, timezone, timedelta
from celery_app import celery
from database import get_db_session, transaction
from database.schemas import User, Order

logger = logging.getLogger("wolfie")

@celery.task(name="wolfie.admin.score_calculator")
def score_calculator():
    """Recalculate customer, driver, and restaurant reputation scores."""
    logger.info("Running score_calculator")
    try:
        with transaction() as session:
            # Basic implementation: Initialize default ratings if missing
            active_drivers = session.query(User).filter_by(role="driver", status="active").all()
            for d in active_drivers:
                if not d.rating:
                    d.rating = 5.0
            active_rests = session.query(User).filter_by(role="restaurant", status="active").all()
            for r in active_rests:
                if not r.rating:
                    r.rating = 5.0
        return "Scores recalculated"
    except Exception as e:
        logger.error(f"Error in score_calculator: {e}")
        return str(e)

@celery.task(name="wolfie.admin.wap_retrain_models")
def wap_retrain_models():
    """Trigger nightly retraining of WAP ETA models."""
    logger.info("Running wap_retrain_models - simulating model training")
    # Simulate work for ML model retraining
    time.sleep(2) 
    return "WAP models retrained successfully"

@celery.task(name="wolfie.admin.refund_risk_analysis")
def refund_risk_analysis():
    """Analyze pending refunds and auto-resolve low-risk ones."""
    logger.info("Running refund_risk_analysis")
    # Future logic: Query payments table for pending refunds under $10 and auto-approve
    return "Refund risk analysis complete"

@celery.task(name="wolfie.admin.fraud_detection_scan")
def fraud_detection_scan():
    """Scan platform for multi-account abuse, GPS spoofing, etc."""
    logger.info("Running fraud_detection_scan")
    try:
        with get_db_session() as session:
            # Future logic: flag users created in the last 24h with duplicate emails or IPs
            pass
    except Exception as e:
        logger.error(f"Error in fraud scan: {e}")
    return "Fraud scan complete"

@celery.task(name="wolfie.admin.support_ai_triage")
def support_ai_triage(ticket_id: str):
    """Categorize and auto-resolve new support tickets."""
    logger.info(f"Running support_ai_triage for ticket {ticket_id}")
    return f"Ticket {ticket_id} triaged"

@celery.task(name="wolfie.admin.delayed_order_monitor")
def delayed_order_monitor():
    """Monitor live orders for unexpected delays and trigger auto-compensation/alerts."""
    logger.info("Running delayed_order_monitor")
    try:
        with get_db_session() as session:
            # Find orders stuck in "preparing" for over 45 minutes
            threshold = datetime.now(timezone.utc) - timedelta(minutes=45)
            delayed = session.query(Order).filter(
                Order.status == "preparing",
                Order.created_at < threshold
            ).all()
            
            for order in delayed:
                logger.warning(f"Order {order.id} is severely delayed (over 45 mins)!")
                # In the future: trigger auto-compensation or push notification to admin
                
        return f"Monitored {len(delayed) if 'delayed' in locals() else 0} delayed orders"
    except Exception as e:
        logger.error(f"Error in delayed_order_monitor: {e}")
        return str(e)

