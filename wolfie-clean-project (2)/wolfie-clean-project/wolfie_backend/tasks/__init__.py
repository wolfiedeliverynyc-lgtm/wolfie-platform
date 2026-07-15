"""
╔══════════════════════════════════════════════════════════════════════════════╗
║          WOLFIE DELIVERY — tasks/__init__.py                                ║
╚══════════════════════════════════════════════════════════════════════════════╝

Usage in routes:
    from tasks.notify   import order_confirmed, order_delivered
    from tasks.matching import assign_driver
    from tasks.payouts  import create_order_payouts
    from tasks.analytics import track

All tasks are async — use .delay() or .apply_async():
    assign_driver.delay(order_id, restaurant_id)
    order_confirmed.apply_async(args=[...], countdown=5)
"""

from tasks.notify    import (
    send_sms, order_confirmed, driver_assigned, order_picked_up,
    order_delivered, order_cancelled, notify_restaurant, notify_driver,
    request_rating, trial_expiring, notify_eta_update, notify_wap_anomaly,
)
from tasks.matching  import assign_driver, reassign_driver
from tasks.payouts   import create_order_payouts, process_pending_payouts, stripe_payout
from tasks.analytics import snapshot_metrics, track_event, track
from tasks.wap       import nightly_retrain, calculate_restaurant_scores

__all__ = [
    # Notifications
    "send_sms", "order_confirmed", "driver_assigned", "order_picked_up",
    "order_delivered", "order_cancelled", "notify_restaurant", "notify_driver",
    "request_rating", "trial_expiring", "notify_eta_update", "notify_wap_anomaly",
    # Matching
    "assign_driver", "reassign_driver",
    # Payouts
    "create_order_payouts", "process_pending_payouts", "stripe_payout",
    # Analytics
    "snapshot_metrics", "track_event", "track",
    # WAP
    "nightly_retrain", "calculate_restaurant_scores",
]
