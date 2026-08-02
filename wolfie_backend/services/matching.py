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
        Finds closest available driver to pickup_coords using Mapbox traffic-aware routing.
        Returns driver dict or None if no driver available.
        """
        from database.session import get_session
        from database.repositories import UserRepository
        from database.repositories.rating import DriverLocationRepository
        
        with get_session() as session:
            user_repo = UserRepository(session)
            loc_repo = DriverLocationRepository(session)
            
            # 1. Get all available drivers
            drivers = user_repo.find_available_drivers()
            if not drivers:
                logger.info("SmartMatching: no available drivers")
                return None
            
            if not pickup_coords or pickup_coords.get("lat") is None or pickup_coords.get("lng") is None:
                logger.error(f"Cannot dispatch order {order_id} — missing pickup coordinates")
                return None

            p_lat = float(pickup_coords["lat"])
            p_lng = float(pickup_coords["lng"])
            
            # 2. Get coordinates and compute Haversine distance as pre-filtering step
            candidates = []
            for driver in drivers:
                loc = loc_repo.get_for_driver(driver.id)
                d_lat, d_lng = None, None
                if loc:
                    d_lat, d_lng = float(loc.lat), float(loc.lng)
                else:
                    redis = getattr(current_app, "redis", None)
                    if redis:
                        last_loc = redis.locations.get(driver.id)
                        if last_loc and last_loc.get("lat") and last_loc.get("lng"):
                            d_lat, d_lng = float(last_loc["lat"]), float(last_loc["lng"])
                
                if d_lat is not None and d_lng is not None:
                    h_dist = self._haversine(p_lat, p_lng, d_lat, d_lng)
                    candidates.append({
                        "driver": driver,
                        "lat": d_lat,
                        "lng": d_lng,
                        "h_dist": h_dist
                    })
                else:
                    candidates.append({
                        "driver": driver,
                        "lat": None,
                        "lng": None,
                        "h_dist": 999.0
                    })
                    # Send alert to driver to activate their location
                    from tasks.notify import send_sms
                    try:
                        send_sms.delay(
                            to=driver.phone,
                            body="🐺 Wolfie: You are online but we cannot detect your GPS location. Please turn on location services on your device to receive orders."
                        )
                        logger.info(f"Sent GPS activation notification to driver {driver.id}")
                    except Exception as ex:
                        logger.warning(f"Could not notify driver {driver.id} about missing GPS: {ex}")

            # Filter candidates with valid coordinates
            valid_candidates = [c for c in candidates if c["lat"] is not None and c["lng"] is not None]
            if not valid_candidates:
                logger.info("SmartMatching: no drivers with valid locations")
                return None

            # Sort by Haversine distance and select top 15 candidates
            valid_candidates.sort(key=lambda x: x["h_dist"])
            top_candidates = valid_candidates[:15]

            # 3. Call Mapbox Matrix API for actual driving distances (propagates any exceptions)
            sources = [{"lat": c["lat"], "lng": c["lng"]} for c in top_candidates]
            destinations = [{"lat": p_lat, "lng": p_lng}]
            
            matrix = self.mapbox.distance_matrix(sources, destinations)

            # 4. Score drivers using Mapbox routing distances
            best_driver = None
            best_score = float("inf")
            
            for idx, c in enumerate(top_candidates):
                dist_km = matrix[idx][0]
                driver = c["driver"]
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

    @staticmethod
    def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Great-circle distance in km."""
        from math import radians, sin, cos, sqrt, atan2
        R = 6371.0
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a    = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
        return R * 2 * atan2(sqrt(a), sqrt(1 - a))
