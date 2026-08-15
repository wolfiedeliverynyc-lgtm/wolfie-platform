"""
WOLFIE DELIVERY — tests/test_webhook_dispatcher.py
Unit and integration tests for HMAC Webhook Signing, HTTP Delivery,
and Celery Exponential Backoff Retries.
"""

import json
import time
import uuid
import pytest
from unittest.mock import patch, MagicMock
from database import transaction, get_db_session
from database.schemas import User, WebhookSubscription, WebhookDeliveryLog
from services.webhook_dispatcher import WebhookDispatcher
from tasks.webhooks import dispatch_webhook_task, _dispatch_webhook_impl
from celery.exceptions import Retry


class TestWebhookDispatcher:

    def test_hmac_signing_and_verification(self):
        """Verify HMAC-SHA256 signature generation and anti-replay protection."""
        secret = "test_webhook_secret_key_123"
        payload = {"event": "order.created", "order_id": "ord_100", "total": 45.0}
        payload_bytes = json.dumps(payload, separators=(',', ':')).encode("utf-8")

        # 1. Valid signature and verification
        sig_header, ts = WebhookDispatcher.sign_payload(payload_bytes, secret)
        assert sig_header.startswith(f"t={ts},v1=")
        assert WebhookDispatcher.verify_signature(payload_bytes, sig_header, secret) is True

        # 2. Tampered payload fails verification
        tampered_bytes = json.dumps({"event": "order.created", "order_id": "ord_100", "total": 999.0}, separators=(',', ':')).encode("utf-8")
        assert WebhookDispatcher.verify_signature(tampered_bytes, sig_header, secret) is False

        # 3. Wrong secret fails verification
        assert WebhookDispatcher.verify_signature(payload_bytes, sig_header, "wrong_secret") is False

        # 4. Expired timestamp (> 300s) fails with replay attack protection
        old_ts = int(time.time()) - 400
        old_sig, _ = WebhookDispatcher.sign_payload(payload_bytes, secret, timestamp=old_ts)
        assert WebhookDispatcher.verify_signature(payload_bytes, old_sig, secret, tolerance_sec=300) is False

    def test_send_webhook_http_success(self):
        """Verify HTTP POST request includes all required headers."""
        target_url = "https://restaurant-pos.example.com/api/webhook"
        secret = "sec_test_abc"
        payload = {"status": "preparing", "order_id": "ord_200"}
        
        with patch("requests.post") as mock_post:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.text = '{"received": true}'
            mock_post.return_value = mock_resp

            success, status_code, body = WebhookDispatcher.send_webhook_http(
                target_url=target_url,
                payload=payload,
                secret=secret,
                event_type="order.status_updated",
                delivery_id="del_001"
            )

            assert success is True
            assert status_code == 200
            assert "received" in body

            mock_post.assert_called_once()
            call_kwargs = mock_post.call_args[1]
            headers = call_kwargs["headers"]
            assert headers["X-Wolfie-Delivery-ID"] == "del_001"
            assert headers["X-Wolfie-Event"] == "order.status_updated"
            assert "X-Wolfie-Signature" in headers
            assert "X-Wolfie-Timestamp" in headers

    def test_celery_task_success(self, client):
        """Verify Celery task marks delivery as successful on HTTP 200."""
        delivery_id = f"del_succ_{uuid.uuid4().hex[:8]}"
        target_url = "https://partner.example.com/webhook"
        secret = "secret_pass_123"
        payload = {"order_id": "ord_1", "status": "delivered"}

        with client.application.app_context():
            with transaction() as db:
                sub = WebhookSubscription(target_url=target_url, secret=secret, event_types=["order.delivered"], is_active=True)
                db.add(sub)
                db.flush()
                subscription_id = sub.id

            with patch("services.webhook_dispatcher.WebhookDispatcher.send_webhook_http") as mock_send:
                mock_send.return_value = (True, 200, "OK")

                mock_self = MagicMock()
                mock_self.request.retries = 0
                mock_self.max_retries = 5

                res = _dispatch_webhook_impl(
                    mock_self,
                    delivery_id=delivery_id,
                    subscription_id=subscription_id,
                    event_type="order.delivered",
                    target_url=target_url,
                    payload=payload,
                    secret=secret
                )

                assert res["status"] == "success"
                assert res["code"] == 200

                # Verify database state
                with get_db_session() as db:
                    log = db.query(WebhookDeliveryLog).filter(WebhookDeliveryLog.id == delivery_id).first()
                    assert log is not None
                    assert log.status == "success"
                    assert log.attempt_count == 1
                    assert log.response_code == 200

    def test_celery_task_exponential_backoff_retry(self, client):
        """Verify Celery task triggers exponential backoff retry on HTTP 503."""
        delivery_id = f"del_retry_{uuid.uuid4().hex[:8]}"
        target_url = "https://partner.example.com/webhook"
        secret = "secret_pass_123"
        payload = {"order_id": "ord_1", "status": "delivered"}

        with client.application.app_context():
            with transaction() as db:
                sub = WebhookSubscription(target_url=target_url, secret=secret, event_types=["order.delivered"], is_active=True)
                db.add(sub)
                db.flush()
                subscription_id = sub.id

            with patch("services.webhook_dispatcher.WebhookDispatcher.send_webhook_http") as mock_send:
                # Mock server unavailable
                mock_send.return_value = (False, 503, "Service Temporarily Unavailable")

                mock_self = MagicMock()
                mock_self.request.retries = 1 # Attempt 2
                mock_self.max_retries = 5
                mock_self.retry.side_effect = Retry("Retrying...")

                with pytest.raises(Retry):
                    _dispatch_webhook_impl(
                        mock_self,
                        delivery_id=delivery_id,
                        subscription_id=subscription_id,
                        event_type="order.delivered",
                        target_url=target_url,
                        payload=payload,
                        secret=secret
                    )

                # Verify retry delay formula (base 10 * 2^1 = 20s + jitter)
                retry_call_kwargs = mock_self.retry.call_args[1]
                countdown = retry_call_kwargs["countdown"]
                assert 20 <= countdown <= 23

                # Verify database log status is retrying
                with get_db_session() as db:
                    log = db.query(WebhookDeliveryLog).filter(WebhookDeliveryLog.id == delivery_id).first()
                    assert log is not None
                    assert log.status == "retrying"
                    assert log.attempt_count == 2
                    assert log.response_code == 503
                    assert log.next_retry_at is not None

    def test_celery_task_max_retries_exceeded_fails(self, client):
        """Verify Celery task marks status='failed' when all retries are exhausted."""
        delivery_id = f"del_fail_{uuid.uuid4().hex[:8]}"
        target_url = "https://partner.example.com/webhook"
        secret = "secret_pass_123"
        payload = {"order_id": "ord_1"}

        with client.application.app_context():
            with transaction() as db:
                sub = WebhookSubscription(target_url=target_url, secret=secret, event_types=["order.created"], is_active=True)
                db.add(sub)
                db.flush()
                subscription_id = sub.id

            with patch("services.webhook_dispatcher.WebhookDispatcher.send_webhook_http") as mock_send:
                mock_send.return_value = (False, 500, "Internal Server Error")

                mock_self = MagicMock()
                mock_self.request.retries = 5 # Exhausted
                mock_self.max_retries = 5

                res = _dispatch_webhook_impl(
                    mock_self,
                    delivery_id=delivery_id,
                    subscription_id=subscription_id,
                    event_type="order.created",
                    target_url=target_url,
                    payload=payload,
                    secret=secret
                )

                assert res["status"] == "failed"

                with get_db_session() as db:
                    log = db.query(WebhookDeliveryLog).filter(WebhookDeliveryLog.id == delivery_id).first()
                    assert log is not None
                    assert log.status == "failed"
                    assert log.attempt_count == 6
                    assert log.response_code == 500
                    assert log.next_retry_at is None

    def test_dispatch_event_subscription_routing(self, client):
        """Verify dispatch_event finds matching subscriptions and enqueues Celery delivery."""
        with client.application.app_context():
            with transaction() as db:
                db.query(WebhookDeliveryLog).delete()
                db.query(WebhookSubscription).delete()
                sub1 = WebhookSubscription(
                    target_url="https://sub1.com/hook",
                    secret="sec_1",
                    event_types=["order.created", "order.delivered"],
                    is_active=True
                )
                sub2 = WebhookSubscription(
                    target_url="https://sub2.com/hook",
                    secret="sec_2",
                    event_types=["payout.settled"],
                    is_active=True
                )
                db.add_all([sub1, sub2])

            with patch("tasks.webhooks.dispatch_webhook_task.delay") as mock_celery_delay:
                delivery_ids = WebhookDispatcher.dispatch_event(
                    event_type="order.delivered",
                    payload={"order_id": "ord_test_99", "status": "delivered"}
                )

                assert len(delivery_ids) == 1
                mock_celery_delay.assert_called_once()
                call_kwargs = mock_celery_delay.call_args[1]
                assert call_kwargs["target_url"] == "https://sub1.com/hook"
                assert call_kwargs["event_type"] == "order.delivered"
