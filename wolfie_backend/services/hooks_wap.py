"""
╔══════════════════════════════════════════════════════════════╗
║  WOLFIE DELIVERY — services/hooks_wap.py                     ║
║  WAP Lifecycle Hooks (PENDING → prediction, DELIVERED → ML) ║
╠══════════════════════════════════════════════════════════════╣
║  HARDENING:                                                  ║
║  ✅ Idempotency guard — same event can't execute twice       ║
║  ✅ Retry with exponential backoff (up to 3 attempts)        ║
║  ✅ Correlation ID threading through all log lines           ║
║  ✅ Hook execution timeout (10s) to prevent hanging calls    ║
║  ✅ Prometheus metrics: executions, success/failure, latency ║
║  ✅ Alert on repeated failures (error_percentage > 20%)      ║
╚══════════════════════════════════════════════════════════════╝
"""

import logging
import time
import uuid
from functools import wraps

logger = logging.getLogger("wolfie.hooks")

# ── Prometheus Metrics — imported from central registry ──────
from services.metrics import wap_hook_executions as hook_executions, wap_hook_duration as hook_duration

# ── Constants ─────────────────────────────────────────────────
_HOOK_TIMEOUT_SECONDS = 10      # Maximum allowed wall-time per hook invocation
_MAX_RETRIES          = 3
_RETRY_BACKOFF        = 0.5     # seconds base, doubles each attempt
_IDEMPOTENCY_TTL      = 3600    # seconds — prevent duplicate executions within 1 hour


# ══════════════════════════════════════════════════════════════
# IDEMPOTENCY GUARD
# ══════════════════════════════════════════════════════════════

def _idempotency_key(event: str, order_id: str) -> str:
    return f"wolfie:hook:done:{event}:{order_id}"


def _already_executed(event: str, order_id: str) -> bool:
    """Returns True if this hook has already run for this order+event."""
    try:
        from flask import current_app
        redis = getattr(current_app, "redis", None)
        if redis:
            return redis.cache.get(_idempotency_key(event, order_id)) is not None
    except RuntimeError:
        pass
    return False


def _mark_executed(event: str, order_id: str):
    """Mark this hook as executed so it won't run again."""
    try:
        from flask import current_app
        redis = getattr(current_app, "redis", None)
        if redis:
            redis.cache.set(_idempotency_key(event, order_id), "1", ttl=_IDEMPOTENCY_TTL)
    except RuntimeError:
        pass


# ══════════════════════════════════════════════════════════════
# RETRY WRAPPER
# ══════════════════════════════════════════════════════════════

def _run_with_retry(fn, event: str, correlation_id: str, *args, **kwargs):
    """
    Execute fn with up to _MAX_RETRIES attempts and exponential backoff.
    Re-raises on final failure.
    """
    last_exc = None
    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            return fn(*args, **kwargs)
        except Exception as e:
            last_exc = e
            logger.warning(
                f"[WAP-Hook] [{correlation_id}] {event} attempt {attempt}/{_MAX_RETRIES} failed: {e}"
            )
            if attempt < _MAX_RETRIES:
                time.sleep(_RETRY_BACKOFF * (2 ** (attempt - 1)))
    raise last_exc


# ══════════════════════════════════════════════════════════════
# HOOK: PENDING → WAP PREDICTION
# ══════════════════════════════════════════════════════════════

def on_pending_wap(order_id: str, result, context: dict):
    """
    Generate WAP ETA prediction when order is created (PENDING state).

    Idempotent — will not re-run if already executed for this order_id.
    Correlation ID is injected for full-chain traceability.
    """
    event          = "wap_pending"
    correlation_id = context.get("request_id") or str(uuid.uuid4())

    # ── Idempotency check (Observation 2) ─────────────────────
    if _already_executed(event, order_id):
        logger.info(f"[WAP-Hook] [{correlation_id}] Skipping duplicate {event} for order {order_id}")
        hook_executions.labels(event=event, status="idempotent_skip").inc()
        return

    t0 = time.monotonic()
    try:
        def _execute():
            from services.wap import WAPEngine
            from database import get_db_session
            from database.repositories import OrderRepository

            with get_db_session() as session:
                order = OrderRepository(session).get(order_id)
                if not order:
                    logger.warning(f"[WAP-Hook] [{correlation_id}] Order {order_id} not found — skipping.")
                    return

                wap        = WAPEngine()
                prediction = wap.predict(
                    order=order,
                    restaurant_id=order.restaurant_id,
                    driver_id=context.get("driver_id"),
                    distance_km=context.get("distance_km")
                )

                # Notify stakeholders via Celery (non-blocking)
                from tasks.notify import notify_eta_update
                if order.customer_id:
                    notify_eta_update.delay(
                        order_id=order_id, user_id=order.customer_id,
                        eta_min=prediction.total_eta_min, role="customer"
                    )
                notify_eta_update.delay(
                    order_id=order_id, user_id=order.restaurant_id,
                    eta_min=prediction.prep_time_min, role="restaurant"
                )
                if order.driver_id:
                    notify_eta_update.delay(
                        order_id=order_id, user_id=order.driver_id,
                        eta_min=prediction.drive_time_min, role="driver"
                    )

                # Cache in Redis for real-time reads
                try:
                    from flask import current_app
                    redis = getattr(current_app, "redis", None)
                    if redis:
                        redis.cache.set(
                            f"order:{order_id}:wap",
                            {
                                "eta_min":      prediction.total_eta_min,
                                "confidence":   prediction.confidence,
                                "predicted_at": prediction.predicted_at.isoformat(),
                            },
                            ttl=3600
                        )
                except Exception as cache_err:
                    logger.warning(f"[WAP-Hook] [{correlation_id}] Redis cache failed (non-critical): {cache_err}")

                logger.info(
                    f"[WAP-Hook] [{correlation_id}] Prediction for {order_id}: "
                    f"{prediction.total_eta_min} min (confidence={prediction.confidence})"
                )

        # ── Run with retry + timeout guard (Observations 1, 5) ──
        import threading
        result_container = [None]
        exc_container    = [None]

        def _target():
            try:
                _run_with_retry(_execute, event, correlation_id)
            except Exception as e:
                exc_container[0] = e

        thread = threading.Thread(target=_target, daemon=True)
        thread.start()
        thread.join(timeout=_HOOK_TIMEOUT_SECONDS)

        if thread.is_alive():
            raise TimeoutError(f"Hook '{event}' timed out after {_HOOK_TIMEOUT_SECONDS}s")
        if exc_container[0]:
            raise exc_container[0]

        # ── Success ───────────────────────────────────────────────
        _mark_executed(event, order_id)
        hook_executions.labels(event=event, status="success").inc()
        hook_duration.labels(event=event).observe(time.monotonic() - t0)

    except Exception as e:
        hook_executions.labels(event=event, status="failure").inc()
        hook_duration.labels(event=event).observe(time.monotonic() - t0)
        logger.error(f"[WAP-Hook] [{correlation_id}] {event} FAILED for order {order_id}: {e}")
        # Non-critical hook — do NOT raise; order flow continues.


# ══════════════════════════════════════════════════════════════
# HOOK: DELIVERED → WAP FEEDBACK
# ══════════════════════════════════════════════════════════════

def on_delivered_wap_feedback(order_id: str, result, context: dict):
    """
    Record WAP feedback and trigger model retraining when order is DELIVERED.

    Idempotent — will not re-run if already executed for this order_id.
    """
    event          = "wap_delivered"
    correlation_id = context.get("request_id") or str(uuid.uuid4())

    # ── Idempotency check ────────────────────────────────────────
    if _already_executed(event, order_id):
        logger.info(f"[WAP-Hook] [{correlation_id}] Skipping duplicate {event} for order {order_id}")
        hook_executions.labels(event=event, status="idempotent_skip").inc()
        return

    t0 = time.monotonic()
    try:
        def _execute():
            from services.wap import WAPEngine
            wap      = WAPEngine()
            feedback = wap.record_feedback(order_id)

            if not feedback:
                logger.warning(f"[WAP-Hook] [{correlation_id}] No feedback data for {order_id}")
                return

            logger.info(
                f"[WAP-Hook] [{correlation_id}] Feedback for {order_id}: "
                f"predicted={feedback.predicted_total}min, "
                f"actual={feedback.actual_total}min, "
                f"error={feedback.error_percentage}%"
            )

            # Alert if prediction error exceeds 20%
            if abs(feedback.error_percentage) > 20:
                try:
                    from tasks.notify import notify_wap_anomaly
                    notify_wap_anomaly.delay(order_id, feedback.error_percentage)
                    logger.warning(
                        f"[WAP-Hook] [{correlation_id}] Anomaly alert sent for {order_id} "
                        f"(error={feedback.error_percentage}%)"
                    )
                except Exception as alert_err:
                    logger.error(f"[WAP-Hook] [{correlation_id}] Failed to send anomaly alert: {alert_err}")

        # ── Run with retry + timeout guard ───────────────────────
        import threading
        exc_container = [None]

        def _target():
            try:
                _run_with_retry(_execute, event, correlation_id)
            except Exception as e:
                exc_container[0] = e

        thread = threading.Thread(target=_target, daemon=True)
        thread.start()
        thread.join(timeout=_HOOK_TIMEOUT_SECONDS)

        if thread.is_alive():
            raise TimeoutError(f"Hook '{event}' timed out after {_HOOK_TIMEOUT_SECONDS}s")
        if exc_container[0]:
            raise exc_container[0]

        # ── Success ───────────────────────────────────────────────
        _mark_executed(event, order_id)
        hook_executions.labels(event=event, status="success").inc()
        hook_duration.labels(event=event).observe(time.monotonic() - t0)

    except Exception as e:
        hook_executions.labels(event=event, status="failure").inc()
        hook_duration.labels(event=event).observe(time.monotonic() - t0)
        logger.error(f"[WAP-Hook] [{correlation_id}] {event} FAILED for order {order_id}: {e}")
        # Non-critical — do NOT raise; order flow continues.
