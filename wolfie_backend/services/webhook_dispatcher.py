"""
╔══════════════════════════════════════════════════════════════════════════════╗
║          WOLFIE DELIVERY — services/webhook_dispatcher.py                    ║
║          HMAC cryptographic signing · Outbound Webhook Delivery Engine       ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import hmac
import hashlib
import time
import json
import logging
import requests
import uuid
from datetime import datetime, timezone
from database import get_session
from database.schemas import WebhookSubscription, WebhookDeliveryLog

logger = logging.getLogger("wolfie.webhooks")
UTC = timezone.utc


class WebhookDispatcher:
    """
    Enterprise Outbound Webhook Dispatcher:
    - HMAC-SHA256 signatures with timestamp anti-replay protection.
    - Standard delivery headers (Delivery-ID, Event, Signature).
    - Celery task dispatch with exponential backoff and persistent delivery logging.
    """

    DEFAULT_TIMEOUT_SEC = 10

    @staticmethod
    def sign_payload(payload_bytes: bytes, secret: str, timestamp: int = None) -> tuple[str, int]:
        """
        Generate HMAC-SHA256 signature for the given payload and secret.
        Format: t={timestamp},v1={hex_signature}
        """
        if timestamp is None:
            timestamp = int(time.time())
            
        signed_payload = f"{timestamp}.".encode("utf-8") + payload_bytes
        signature = hmac.new(
            key=secret.encode("utf-8"),
            msg=signed_payload,
            digestmod=hashlib.sha256
        ).hexdigest()
        
        header_value = f"t={timestamp},v1={signature}"
        return header_value, timestamp

    @staticmethod
    def verify_signature(payload_bytes: bytes, signature_header: str, secret: str, tolerance_sec: int = 300) -> bool:
        """
        Verify incoming HMAC signature header and protect against replay attacks.
        """
        if not signature_header or not secret:
            return False
            
        try:
            parts = dict(item.split("=", 1) for item in signature_header.split(","))
            timestamp = int(parts.get("t", 0))
            provided_sig = parts.get("v1", "")
            
            # Replay attack protection
            current_ts = int(time.time())
            if abs(current_ts - timestamp) > tolerance_sec:
                logger.warning(f"Webhook signature timestamp out of tolerance ({timestamp} vs {current_ts})")
                return False
                
            signed_payload = f"{timestamp}.".encode("utf-8") + payload_bytes
            expected_sig = hmac.new(
                key=secret.encode("utf-8"),
                msg=signed_payload,
                digestmod=hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(provided_sig, expected_sig)
        except Exception as e:
            logger.error(f"Error verifying webhook signature: {e}")
            return False

    @classmethod
    def send_webhook_http(
        cls,
        target_url: str,
        payload: dict,
        secret: str,
        event_type: str,
        delivery_id: str = None,
        timeout: int = DEFAULT_TIMEOUT_SEC
    ) -> tuple[bool, int, str]:
        """
        Direct synchronous HTTP POST to target URL with cryptographic signature.
        Returns: (success: bool, status_code: int, response_text: str)
        """
        delivery_id = delivery_id or str(uuid.uuid4())
        payload_bytes = json.dumps(payload, separators=(',', ':'), default=str).encode("utf-8")
        sig_header, ts = cls.sign_payload(payload_bytes, secret)
        
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Wolfie-Webhook-Dispatcher/1.0",
            "X-Wolfie-Delivery-ID": delivery_id,
            "X-Wolfie-Event": event_type,
            "X-Wolfie-Signature": sig_header,
            "X-Wolfie-Timestamp": str(ts),
        }
        
        try:
            response = requests.post(
                target_url,
                data=payload_bytes,
                headers=headers,
                timeout=timeout
            )
            is_success = 200 <= response.status_code < 300
            resp_body = response.text[:1000] if response.text else ""
            return is_success, response.status_code, resp_body
        except requests.exceptions.RequestException as ex:
            logger.warning(f"HTTP error dispatching webhook {delivery_id} to {target_url}: {ex}")
            return False, 0, str(ex)

    @classmethod
    def dispatch_event(cls, event_type: str, payload: dict, restaurant_id: str = None) -> list[str]:
        """
        Find matching subscriptions and schedule asynchronous Celery deliveries.
        Returns list of created delivery IDs.
        """
        from tasks.webhooks import dispatch_webhook_task
        delivery_ids = []
        
        try:
            with get_session() as db:
                query = db.query(WebhookSubscription).filter(WebhookSubscription.is_active == True)
                if restaurant_id:
                    query = query.filter(
                        (WebhookSubscription.restaurant_id == restaurant_id) |
                        (WebhookSubscription.restaurant_id.is_(None))
                    )
                subscriptions = query.all()
                
                for sub in subscriptions:
                    # Check event types filter
                    if sub.event_types and event_type not in sub.event_types and "*" not in sub.event_types:
                        continue
                        
                    delivery_id = str(uuid.uuid4())
                    log = WebhookDeliveryLog(
                        id=delivery_id,
                        subscription_id=sub.id,
                        event_type=event_type,
                        target_url=sub.target_url,
                        payload=payload,
                        attempt_count=0,
                        status="pending"
                    )
                    db.add(log)
                    db.flush()
                    delivery_ids.append(delivery_id)
                    
                    # Enqueue Celery retry task
                    try:
                        dispatch_webhook_task.delay(
                            delivery_id=delivery_id,
                            subscription_id=sub.id,
                            event_type=event_type,
                            target_url=sub.target_url,
                            payload=payload,
                            secret=sub.secret
                        )
                    except Exception as e:
                        logger.error(f"Failed to enqueue webhook task {delivery_id}: {e}")
                        
                db.commit()
        except Exception as e:
            logger.error(f"Error dispatching webhook event {event_type}: {e}")
            
        return delivery_ids
