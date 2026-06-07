"""
╔══════════════════════════════════════════════════════════════╗
║  WOLFIE DELIVERY — smart_matching_engine.py                  ║
║  Compatible with app.py:                                     ║
║      SmartMatchingEngine(mapbox, config)                     ║
║      .find_best_driver(order_id, pickup_coords, restaurant_id)
╚══════════════════════════════════════════════════════════════╝
"""

import logging
from database import get_session
from database.repositories import UserRepository
from database.repositories.rating import DriverLocationRepository
from flask import current_app

logger = logging.getLogger("wolfie")


class SmartMatchingEngine:

    def __init__(self, mapbox, config: dict):
        self.mapbox  = mapbox
        self.config  = config
        logger.info("SmartMatchingEngine: ready")

    def find_best_driver(self, order_id: str,
                          pickup_coords: dict = None,
                          restaurant_id: str  = None) -> dict | None:
        """
        Finds closest available driver to pickup_coords.
        Returns driver dict or None if no driver available.
        """
        db = getattr(current_app, "db", None)
        if not db:
            return None

        try:
            # Get all available drivers with their locations
            drivers_res = (
                db.table("users")
                .select("id, full_name, rating, phone")
                .eq("role", "driver")
                .eq("is_available", True)
                .execute()
            )
            drivers = drivers_res.data or []

            if not drivers:
                logger.info("SmartMatching: no available drivers")
                return None

            # Get their locations
            driver_ids  = [d["id"] for d in drivers]
            loc_res     = (
                db.table("driver_locations")
                .select("driver_id, lat, lng")
                .in_("driver_id", driver_ids)
                .execute()
            )
            locations   = {l["driver_id"]: l for l in (loc_res.data or [])}

            if not locations or not pickup_coords:
                # No location data → pick highest rated driver
                best = max(drivers, key=lambda d: d.get("rating", 0))
                return best

            # Score: distance (km) weighted by rating
            best_driver = None
            best_score  = float("inf")

            for driver in drivers:
                loc = locations.get(driver["id"])
                if not loc:
                    continue

                dist_km = self._haversine(
                    pickup_coords.get("lat", 40.7128),
                    pickup_coords.get("lng", -73.9866),
                    loc["lat"],
                    loc["lng"]
                )
                # Lower score = better (penalize distance, reward rating)
                score = dist_km - (driver.get("rating", 4.0) * 0.3)

                if score < best_score:
                    best_score  = score
                    best_driver = {**driver, "distance_km": round(dist_km, 2)}

            if best_driver:
                logger.info(f"Matched driver {best_driver['id']} for order {order_id} (dist={best_driver['distance_km']}km)")

            return best_driver

        except Exception as e:
            logger.error(f"SmartMatching error: {e}")
            return None

    @staticmethod
    def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Great-circle distance in km."""
        from math import radians, sin, cos, sqrt, atan2
        R = 6371.0
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a    = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
        return R * 2 * atan2(sqrt(a), sqrt(1 - a))
