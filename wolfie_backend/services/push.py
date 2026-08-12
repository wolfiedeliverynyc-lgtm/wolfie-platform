"""
╔══════════════════════════════════════════════════════════════╗
║  WOLFIE DELIVERY — push_notification_engine.py               ║
║  Compatible with app.py:                                     ║
║      PushNotificationEngine(twilio_sid, twilio_token, twilio_from)
║      .send_sms(to, body)                                     ║
╚══════════════════════════════════════════════════════════════╝
"""

import uuid
import time
import logging
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger("wolfie")


class PushNotificationEngine:

    def __init__(self, twilio_sid: str = None, twilio_token: str = None,
                 twilio_from: str = None):
        self._mock = True
        self._from = twilio_from
        self._executor = ThreadPoolExecutor(max_workers=5)
        self._local_rate_limit = {}  # Fallback for rate limiting in memory
        logger.warning("PushNotificationEngine: Force mock mode (Twilio deactivated)")

    def _is_rate_limited(self, to: str, limit: int = 5, window_seconds: int = 60) -> bool:
        """
        Check rate limiting to prevent spamming notifications to the same recipient.
        Uses Redis if available, falls back to in-memory tracking.
        """
        from flask import current_app
        try:
            redis = getattr(current_app, "redis", None)
            if redis and redis.ping():
                key = f"rate_limit:notif:{to}"
                now = time.time()
                current_time_ms = int(now * 1000)
                window_start_ms = current_time_ms - (window_seconds * 1000)
                
                # ZREMRANGEBYSCORE to clean old timestamps
                redis._r.zremrangebyscore(key, 0, window_start_ms)
                # ZCARD to get current count
                count = redis._r.zcard(key)
                
                if count >= limit:
                    return True
                
                # ZADD to register this notification
                redis._r.zadd(key, {str(uuid.uuid4()): current_time_ms})
                redis._r.expire(key, window_seconds)
                return False
        except Exception as e:
            logger.warning(f"Redis rate limiter failed: {e}. Falling back to in-memory rate limiting.")

        # In-memory rate limiter fallback
        now = time.time()
        timestamps = self._local_rate_limit.setdefault(to, [])
        self._local_rate_limit[to] = [ts for ts in timestamps if now - ts < window_seconds]
        if len(self._local_rate_limit[to]) >= limit:
            return True
        self._local_rate_limit[to].append(now)
        return False

    def send_sms(self, to: str, body: str) -> dict:
        """
        Send SMS with retries, rate limiting, and unique notification ID tracking.
        Raises exception on failure to allow Celery task retries.
        """
        notification_id = str(uuid.uuid4())

        # Rate Limiting
        if self._is_rate_limited(to, limit=5, window_seconds=60):
            logger.warning(f"[Rate Limited] SMS to {to} blocked. ID: {notification_id}")
            raise RuntimeError("Rate limit exceeded for SMS (max 5 per minute)")

        if self._mock:
            logger.info(f"[MOCK SMS] [{notification_id}] → {to}: {body}")
            return {"status": "sent", "notification_id": notification_id}

        max_attempts = 3
        backoff = 1.0
        last_error = None

        for attempt in range(max_attempts):
            try:
                if not hasattr(self, "_client") or self._client is None:
                    raise AttributeError("Twilio client is not initialized")
                
                self._client.messages.create(to=to, from_=self._from, body=body)
                logger.info(f"SMS sent successfully. [ID: {notification_id}] To: {to}")
                return {"status": "sent", "notification_id": notification_id}
            except Exception as e:
                last_error = e
                logger.warning(f"SMS attempt {attempt + 1} failed for {to}: {e}. ID: {notification_id}")
                time.sleep(backoff * (2 ** attempt))

        logger.error(f"SMS permanently failed to {to} after {max_attempts} attempts. ID: {notification_id}")
        raise last_error if last_error else RuntimeError("Failed to send SMS")

    def send_sms_async(self, to: str, body: str):
        """Send SMS asynchronously on a background thread pool executor."""
        return self._executor.submit(self.send_sms, to, body)

    def send_push(self, token: str, title: str, body: str) -> dict:
        """Send push notification with rate limiting and unique notification ID tracking."""
        notification_id = str(uuid.uuid4())

        if self._is_rate_limited(token, limit=10, window_seconds=60):
            logger.warning(f"[Rate Limited] Push to token {token[:10]}... blocked. ID: {notification_id}")
            raise RuntimeError("Rate limit exceeded for Push (max 10 per minute)")

        logger.info(f"[MOCK PUSH] [{notification_id}] Token: {token[:15]}... | Title: {title} | Body: {body}")
        return {"status": "sent", "notification_id": notification_id}

    def send_push_async(self, token: str, title: str, body: str):
        """Send push notification asynchronously on a background thread pool executor."""
        return self._executor.submit(self.send_push, token, title, body)

    # ── Order lifecycle SMS ───────────────────

    def notify_order_placed(self, phone: str, order_id: str, total: float):
        self.send_sms(phone, f"🐺 Wolfie: Order #{order_id[:8]} placed! Total: ${total:.2f}")

    def notify_order_accepted(self, phone: str, order_id: str, eta_min: int):
        self.send_sms(phone, f"🐺 Wolfie: Your order is being prepared. ETA: {eta_min} min")

    def notify_driver_assigned(self, phone: str, driver_name: str):
        self.send_sms(phone, f"🐺 Wolfie: {driver_name} is picking up your order!")

    def notify_out_for_delivery(self, phone: str, eta_min: int):
        self.send_sms(phone, f"🐺 Wolfie: Your order is on the way! ETA: {eta_min} min 🛵")

    def notify_delivered(self, phone: str):
        self.send_sms(phone, "🐺 Wolfie: Your order was delivered! Enjoy your meal 🍔")

    def notify_driver_new_order(self, phone: str, order_id: str, pickup: str):
        self.send_sms(phone, f"🐺 New order #{order_id[:8]}! Pickup: {pickup}")
