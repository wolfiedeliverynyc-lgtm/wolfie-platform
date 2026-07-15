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
        from database.session import get_session
        from database.repositories import UserRepository
        from database.repositories.rating import DriverLocationRepository
        
        try:
            with get_session() as session:
                user_repo = UserRepository(session)
                loc_repo = DriverLocationRepository(session)
                
                # 1. Get all available drivers
                drivers = user_repo.find_available_drivers()
                if not drivers:
                    logger.info("SmartMatching: no available drivers")
                    return None
                
                # 2. Score drivers
                best_driver = None
                best_score = float("inf")
                
                p_lat = float(pickup_coords.get("lat", 36.7525)) if pickup_coords else 36.7525
                p_lng = float(pickup_coords.get("lng", 3.0588)) if pickup_coords else 3.0588
                
                for driver in drivers:
                    loc = loc_repo.get_for_driver(driver.id)
                    
                    dist_km = 999.0
                    if loc:
                        dist_km = self._haversine(p_lat, p_lng, float(loc.lat), float(loc.lng))
                    else:
                        redis = getattr(current_app, "redis", None)
                        if redis:
                            last_loc = redis.locations.get(driver.id)
                            if last_loc and last_loc.get("lat") and last_loc.get("lng"):
                                dist_km = self._haversine(p_lat, p_lng, float(last_loc["lat"]), float(last_loc["lng"]))
                    
                    score = dist_km - (float(driver.rating or 5.0) * 0.3)
                    
                    if score < best_score:
                        best_score = score
                        best_driver = {
                            "id": driver.id,
                            "name": driver.full_name,
                            "phone": driver.phone,
                            "rating": driver.rating,
                            "distance_km": round(dist_km, 2)
                        }
                
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
