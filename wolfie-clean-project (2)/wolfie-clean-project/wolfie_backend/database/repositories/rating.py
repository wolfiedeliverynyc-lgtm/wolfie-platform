"""
╔══════════════════════════════════════════════════════════════╗
║   WOLFIE DELIVERY — database/repositories/rating.py          ║
╚══════════════════════════════════════════════════════════════╝
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import select, func
from database.repositories.base import BaseRepository
from database.schemas import Review, User, DriverLocation

UTC = timezone.utc


class RatingRepository(BaseRepository[Review]):
    model = Review

    def find_for_driver(self, driver_id: str, limit: int = 50) -> list[Review]:
        return self.list(filters={"reviewee_id": driver_id, "role": "driver"},
                         order_by="created_at", limit=limit)

    def find_for_restaurant(self, restaurant_id: str, limit: int = 50) -> list[Review]:
        return self.list(filters={"reviewee_id": restaurant_id, "role": "restaurant"},
                         order_by="created_at", limit=limit)

    def already_rated(self, order_id: str) -> bool:
        return self.exists(order_id=order_id)

    def create(self, order_id: str, customer_id: str,
               driver_id: str = None, restaurant_id: str = None,
               driver_rating: int = None, restaurant_rating: int = None,
               comment: str = None) -> list[Review]:

        if self.already_rated(order_id):
            raise ValueError("Order already rated")
        if not driver_rating and not restaurant_rating:
            raise ValueError("At least one rating required")

        created = []
        now     = datetime.now(UTC)

        if driver_id and driver_rating:
            if not (1 <= driver_rating <= 5):
                raise ValueError("Driver rating must be 1-5")
            review = Review(
                id          = str(uuid.uuid4()),
                order_id    = order_id,
                reviewer_id = customer_id,
                reviewee_id = driver_id,
                role        = "driver",
                rating      = driver_rating,
                comment     = comment or "",
                created_at  = now,
            )
            self.add(review)
            created.append(review)
            self._recalculate(driver_id, "driver")

        if restaurant_id and restaurant_rating:
            if not (1 <= restaurant_rating <= 5):
                raise ValueError("Restaurant rating must be 1-5")
            review = Review(
                id          = str(uuid.uuid4()),
                order_id    = order_id,
                reviewer_id = customer_id,
                reviewee_id = restaurant_id,
                role        = "restaurant",
                rating      = restaurant_rating,
                comment     = comment or "",
                created_at  = now,
            )
            self.add(review)
            created.append(review)
            self._recalculate(restaurant_id, "restaurant")

        return created

    def _recalculate(self, user_id: str, role: str) -> float:
        reviews = self.list(filters={"reviewee_id": user_id, "role": role}, limit=10_000)
        if not reviews:
            return 5.0
        avg  = round(sum(r.rating for r in reviews) / len(reviews), 2)
        user = self.session.get(User, user_id)
        if user:
            user.rating     = avg
            user.updated_at = datetime.now(UTC)
            self.session.flush()
        return avg

    def summary(self, user_id: str, role: str) -> dict:
        reviews = self.list(filters={"reviewee_id": user_id, "role": role}, limit=10_000)
        scores  = [r.rating for r in reviews]
        return {
            "total_ratings": len(scores),
            "average":       round(sum(scores) / len(scores), 2) if scores else 0,
            "breakdown":     {str(i): scores.count(i) for i in range(1, 6)},
        }


class DriverLocationRepository(BaseRepository[DriverLocation]):
    model = DriverLocation

    def upsert(self, driver_id: str, lat: float, lng: float,
               order_id: str = None) -> DriverLocation:
        loc = self.session.get(DriverLocation, driver_id)
        now = datetime.now(UTC)

        if loc:
            loc.lat        = lat
            loc.lng        = lng
            loc.order_id   = order_id
            loc.updated_at = now
            self.session.flush()
        else:
            loc = DriverLocation(
                driver_id  = driver_id,
                lat        = lat,
                lng        = lng,
                order_id   = order_id,
                updated_at = now,
            )
            self.add(loc)
        return loc

    def get_for_driver(self, driver_id: str) -> DriverLocation | None:
        return self.session.get(DriverLocation, driver_id)
