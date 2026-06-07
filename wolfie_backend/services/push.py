"""
╔══════════════════════════════════════════════════════════════╗
║  WOLFIE DELIVERY — push_notification_engine.py               ║
║  Compatible with app.py:                                     ║
║      PushNotificationEngine(twilio_sid, twilio_token, twilio_from)
║      .send_sms(to, body)                                     ║
╚══════════════════════════════════════════════════════════════╝
"""

import logging

logger = logging.getLogger("wolfie")


class PushNotificationEngine:

    def __init__(self, twilio_sid: str = None, twilio_token: str = None,
                 twilio_from: str = None):
        self._mock = not all([twilio_sid, twilio_token, twilio_from])
        self._from = twilio_from

        if not self._mock:
            from twilio.rest import Client
            self._client = Client(twilio_sid, twilio_token)
            logger.info("PushNotificationEngine: Twilio ready")
        else:
            logger.warning("PushNotificationEngine: mock mode (no Twilio keys)")

    def send_sms(self, to: str, body: str) -> bool:
        if self._mock:
            logger.info(f"[MOCK SMS] → {to}: {body}")
            return True
        try:
            self._client.messages.create(to=to, from_=self._from, body=body)
            return True
        except Exception as e:
            logger.error(f"SMS failed to {to}: {e}")
            return False

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
