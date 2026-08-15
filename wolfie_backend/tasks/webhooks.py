"""
╔══════════════════════════════════════════════════════════════════════════════╗
║          WOLFIE DELIVERY — tasks/webhooks.py                                ║
║          Celery Webhook Delivery with Exponential Backoff + Jitter           ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import logging
import random
from datetime import datetime, timezone, timedelta
from celery_app import celery
from celery.exceptions import MaxRetriesExceededError
from database import get_session
from database.schemas import WebhookDeliveryLog

logger = logging.getLogger("wolfie.tasks.webhooks")
UTC = timezone.utc


def _dispatch_webhook_impl(
    task_self,
    delivery_id: str,
    subscription_id: str,
    event_type: str,
    target_url: str,
    payload: dict,
    secret: str,
):
    """
    Core implementation of webhook delivery with Exponential Backoff and jitter.
    """
    from services.webhook_dispatcher import WebhookDispatcher
    
    current_attempt = task_self.request.retries + 1
    max_retries = getattr(task_self, "max_retries", 5)
    logger.info(f"Dispatching webhook {delivery_id} ({event_type}) to {target_url} [Attempt {current_attempt}/{max_retries + 1}]")
    
    # Send HTTP request
    success, status_code, resp_body = WebhookDispatcher.send_webhook_http(
        target_url=target_url,
        payload=payload,
        secret=secret,
        event_type=event_type,
        delivery_id=delivery_id
    )
    
    now = datetime.now(UTC)
    
    with get_session() as db:
        log = db.query(WebhookDeliveryLog).filter(WebhookDeliveryLog.id == delivery_id).first()
        if not log:
            log = WebhookDeliveryLog(
                id=delivery_id,
                subscription_id=subscription_id,
                event_type=event_type,
                target_url=target_url,
                payload=payload,
            )
            db.add(log)
            
        log.attempt_count = current_attempt
        log.response_code = status_code
        log.response_body = resp_body[:1000] if resp_body else None
        log.updated_at = now
        
        if success:
            log.status = "success"
            log.error_message = None
            log.next_retry_at = None
            db.commit()
            logger.info(f"Webhook {delivery_id} delivered successfully (HTTP {status_code}) ✅")
            return {"status": "success", "delivery_id": delivery_id, "code": status_code}
            
        # Failed delivery attempt
        err_msg = f"HTTP {status_code}: {resp_body}" if status_code else f"Network error: {resp_body}"
        log.error_message = err_msg
        
        # Check if retries available
        if task_self.request.retries < max_retries:
            base_delay = 10
            jitter = random.uniform(0.5, 2.0)
            countdown = int(min(3600, base_delay * (2 ** task_self.request.retries) + jitter))
            
            log.status = "retrying"
            log.next_retry_at = now + timedelta(seconds=countdown)
            db.commit()
            
            logger.warning(
                f"Webhook {delivery_id} failed ({err_msg}). Retrying in {countdown}s "
                f"[Attempt {current_attempt}/{max_retries + 1}]"
            )
            raise task_self.retry(exc=Exception(err_msg), countdown=countdown)
        else:
            log.status = "failed"
            log.next_retry_at = None
            db.commit()
            logger.error(
                f"Webhook {delivery_id} permanently failed after {current_attempt} attempts ({err_msg}) ❌"
            )
            return {"status": "failed", "delivery_id": delivery_id, "error": err_msg}


@celery.task(
    name="tasks.webhooks.dispatch_webhook_task",
    queue="notifications",
    bind=True,
    max_retries=5,
    default_retry_delay=10,
)
def dispatch_webhook_task(
    self,
    delivery_id: str,
    subscription_id: str,
    event_type: str,
    target_url: str,
    payload: dict,
    secret: str,
):
    return _dispatch_webhook_impl(
        self,
        delivery_id=delivery_id,
        subscription_id=subscription_id,
        event_type=event_type,
        target_url=target_url,
        payload=payload,
        secret=secret
    )
