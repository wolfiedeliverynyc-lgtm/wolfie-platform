"""
╔══════════════════════════════════════════════════════════════╗
║   WOLFIE DELIVERY — database/repositories/payment.py         ║
╚══════════════════════════════════════════════════════════════╝
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import select, func
from database.repositories.base import BaseRepository
from database.schemas import Payment, DriverPayout, RestaurantOrderPayout

UTC = timezone.utc


class PaymentRepository(BaseRepository[Payment]):
    model = Payment

    def find_by_order(self, order_id: str) -> Payment | None:
        return self.find_by(order_id=order_id)

    def find_by_customer(self, customer_id: str, limit: int = 20) -> list[Payment]:
        return self.list(filters={"customer_id": customer_id},
                         order_by="created_at", limit=limit)

    def create(self, order_id: str, customer_id: str, amount: float,
               method: str, stripe_payment_intent_id: str = None) -> Payment:
        if amount <= 0:
            raise ValueError("Amount must be greater than 0")
        if method not in {"cash", "card", "stripe"}:
            raise ValueError("Invalid payment method")

        now = datetime.now(UTC)
        payment = Payment(
            id                       = str(uuid.uuid4()),
            order_id                 = order_id,
            customer_id              = customer_id,
            amount                   = round(amount, 2),
            method                   = method,
            status                   = "pending",
            stripe_payment_intent_id = stripe_payment_intent_id,
            created_at               = now,
            updated_at               = now,
        )
        return self.add(payment)

    def mark_completed(self, payment: Payment, stripe_charge_id: str = None) -> Payment:
        updates = {"status": "completed"}
        if stripe_charge_id:
            updates["stripe_charge_id"] = stripe_charge_id
        return self.update(payment, **updates)

    def mark_failed(self, payment: Payment, reason: str = None) -> Payment:
        updates = {"status": "failed"}
        if reason:
            updates["failure_reason"] = reason
        return self.update(payment, **updates)

    def mark_refunded(self, payment: Payment, refund_id: str = None) -> Payment:
        updates = {"status": "refunded"}
        if refund_id:
            updates["stripe_refund_id"] = refund_id
        return self.update(payment, **updates)

    def platform_summary(self) -> dict:
        payments   = self.list(limit=100_000)
        completed  = [p for p in payments if p.status == "completed"]
        by_method  = {}
        for p in completed:
            by_method[p.method] = round(by_method.get(p.method, 0) + p.amount, 2)
        return {
            "total":         len(payments),
            "completed":     len(completed),
            "failed":        len([p for p in payments if p.status == "failed"]),
            "refunded":      len([p for p in payments if p.status == "refunded"]),
            "total_volume":  round(sum(p.amount for p in completed), 2),
            "by_method":     by_method,
        }


class DriverPayoutRepository(BaseRepository[DriverPayout]):
    model = DriverPayout

    def find_by_driver(self, driver_id: str) -> list[DriverPayout]:
        return self.list(filters={"driver_id": driver_id}, order_by="created_at")

    def create(self, driver_id: str, order_id: str, amount: float,
               week_start: str = None) -> DriverPayout:
        now = datetime.now(UTC)
        return self.add(DriverPayout(
            id         = str(uuid.uuid4()),
            driver_id  = driver_id,
            order_id   = order_id,
            amount     = round(amount, 2),
            status     = "pending",
            week_start = week_start,
            created_at = now,
            updated_at = now,
        ))


class RestaurantPayoutRepository(BaseRepository[RestaurantOrderPayout]):
    model = RestaurantOrderPayout

    def find_by_restaurant(self, restaurant_id: str) -> list[RestaurantOrderPayout]:
        return self.list(filters={"restaurant_id": restaurant_id}, order_by="created_at")

    def create(self, restaurant_id: str, order_id: str,
               net_amount: float, commission: float) -> RestaurantOrderPayout:
        now = datetime.now(UTC)
        return self.add(RestaurantOrderPayout(
            id            = str(uuid.uuid4()),
            restaurant_id = restaurant_id,
            order_id      = order_id,
            net_amount    = round(net_amount, 2),
            commission    = round(commission, 2),
            status        = "pending",
            created_at    = now,
            updated_at    = now,
        ))
