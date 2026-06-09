"""
╔══════════════════════════════════════════════════════════════════════════════╗
║          WOLFIE DELIVERY — celery_app.py                                    ║
║          Celery factory — wired to Redis + Flask app context                ║
╚══════════════════════════════════════════════════════════════════════════════╝

ARCHITECTURE:
                                                         ┌─────────────────┐
  Flask route                                            │  CELERY WORKER  │
      │                                                  │                 │
      │  .delay() / .apply_async()                       │  tasks/         │
      ▼                                                  │  ├─ notify.py   │
  ┌──────────┐   Redis DB5 (broker)   ┌──────────────┐  │  ├─ matching.py │
  │  QUEUE   │ ──────────────────────►│   WORKER     │  │  ├─ analytics.py│
  │  BROKER  │                        │   picks up   │  │  └─ payouts.py  │
  └──────────┘                        └──────┬───────┘  └─────────────────┘
                                             │ result
                                             ▼
                                     Redis DB6 (backend)

QUEUES:
  notifications   — SMS, push alerts            (concurrency 4)
  matching        — driver assignment            (concurrency 2)
  analytics       — event tracking               (concurrency 2)
  payouts         — financial processing         (concurrency 1, FIFO)
  default         — everything else              (concurrency 2)

START WORKERS:
  # All queues
  celery -A celery_app worker --loglevel=info

  # Specific queues
  celery -A celery_app worker -Q notifications,matching --concurrency=4

  # Beat scheduler (periodic tasks)
  celery -A celery_app beat --loglevel=info

  # Monitor
  celery -A celery_app flower --port=5555
"""

import os
from celery import Celery
from celery.schedules import crontab
from kombu import Queue, Exchange

# ── Redis URLs ────────────────────────────────────────────────────────────────
REDIS_URL    = os.getenv("REDIS_URL",    "redis://localhost:6379")
IS_TESTING   = os.getenv("FLASK_ENV") == "testing"

# Check if Redis is reachable in dev mode, otherwise use eager local memory broker
redis_available = False
if not IS_TESTING:
    try:
        import redis
        r = redis.Redis.from_url(REDIS_URL, socket_timeout=1.0, socket_connect_timeout=1.0)
        redis_available = r.ping()
    except Exception:
        redis_available = False
else:
    redis_available = False

USE_EAGER = not redis_available

BROKER_URL   = "memory://" if (IS_TESTING or USE_EAGER) else REDIS_URL
BACKEND_URL  = "cache+memory://" if (IS_TESTING or USE_EAGER) else REDIS_URL


# ══════════════════════════════════════════════════════════════════════════════
# CELERY FACTORY
# ══════════════════════════════════════════════════════════════════════════════

def make_celery(app=None) -> Celery:
    """
    Create and configure the Celery instance.
    If Flask app is provided, tasks run inside app context.
    """
    celery = Celery(
        "wolfie",
        broker  = BROKER_URL,
        backend = BACKEND_URL,
    )

    celery.config_from_object(_CeleryConfig)

    if app is not None:
        _bind_flask(celery, app)

    return celery


class _CeleryConfig:
    # ── Broker ────────────────────────────────
    broker_url                  = BROKER_URL
    result_backend              = None
    broker_connection_retry_on_startup = True
    task_always_eager           = IS_TESTING or USE_EAGER
    task_eager_propagates       = IS_TESTING or USE_EAGER

    # ── Serialization ─────────────────────────
    task_serializer             = "json"
    result_serializer           = "json"
    accept_content              = ["json"]
    timezone                    = "UTC"
    enable_utc                  = True

    # ── Queues ────────────────────────────────
    task_queues = (
        Queue("notifications", Exchange("notifications"), routing_key="notifications"),
        Queue("matching",      Exchange("matching"),      routing_key="matching"),
        Queue("analytics",     Exchange("analytics"),     routing_key="analytics"),
        Queue("payouts",       Exchange("payouts"),       routing_key="payouts"),
        Queue("wap",           Exchange("wap"),           routing_key="wap"),
        Queue("default",       Exchange("default"),       routing_key="default"),
    )
    task_default_queue       = "default"
    task_default_exchange    = "default"
    task_default_routing_key = "default"

    # ── Task routing (auto) ───────────────────
    task_routes = {
        "tasks.notify.*":    {"queue": "notifications"},
        "tasks.matching.*":  {"queue": "matching"},
        "tasks.analytics.*": {"queue": "analytics"},
        "tasks.payouts.*":   {"queue": "payouts"},
        "tasks.wap.*":       {"queue": "wap"},
        "wolfie.admin.*":    {"queue": "default"},
    }

    # ── Retry policy ──────────────────────────
    task_acks_late                = True    # re-queue on worker crash
    task_reject_on_worker_lost    = True
    task_max_retries              = 5
    task_default_retry_delay      = 30      # seconds

    # ── Results ───────────────────────────────
    result_expires                = 3600    # 1 hour
    task_ignore_result            = False

    # ── Concurrency ───────────────────────────
    worker_prefetch_multiplier    = 1       # fair dispatch
    worker_max_tasks_per_child    = 100     # prevent memory leaks

    # ── Beat schedule (periodic tasks) ───────────
    beat_schedule = {
        # Expire driver trials every day at midnight
        "expire-trials-daily": {
            "task":     "tasks.notify.expire_driver_trials",
            "schedule": crontab(hour=0, minute=0),
        },
        # Process pending payouts every hour
        "process-payouts-hourly": {
            "task":     "tasks.payouts.process_pending_payouts",
            "schedule": crontab(minute=0),
        },
        # Analytics snapshot every 15 min
        "analytics-snapshot": {
            "task":     "tasks.analytics.snapshot_metrics",
            "schedule": crontab(minute="*/15"),
        },
        # Clean up stale pending orders (>3 min old)
        "cancel-stale-orders": {
            "task":     "tasks.notify.cancel_stale_orders",
            "schedule": crontab(minute="*/1"),
        },
        # Weekly driver earnings report (Monday 6am)
        "weekly-driver-report": {
            "task":     "tasks.analytics.weekly_driver_report",
            "schedule": crontab(hour=6, minute=0, day_of_week=1),
        },
        # WAP Model Retraining (nightly at 2am)
        "nightly-wap-retrain": {
            "task":     "tasks.wap.nightly_retrain",
            "schedule": crontab(hour=2, minute=0),
        },
        # Restaurant Scores Calculation (every 6 hours)
        "calculate-restaurant-scores": {
            "task":     "tasks.wap.calculate_restaurant_scores",
            "schedule": crontab(minute=0, hour="*/6"),
        },
    }


def _bind_flask(celery: Celery, app):
    """Make every task run inside a Flask app context."""
    TaskBase = celery.Task

    class ContextTask(TaskBase):
        abstract = True

        def __call__(self, *args, **kwargs):
            with app.app_context():
                return super().__call__(*args, **kwargs)

    celery.Task = ContextTask
    app.celery  = celery
    return celery


# ── Lazy singleton ────────────────────────────────────────────────────────────
# Import this everywhere: from celery_app import celery
celery = make_celery(None)

def init_celery():
    from app import create_app
    flask_app = create_app()
    _bind_flask(celery, flask_app)

init_celery()
