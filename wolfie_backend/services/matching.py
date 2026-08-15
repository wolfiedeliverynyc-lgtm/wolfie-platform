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


# In-process cooldown cache when Redis is unavailable
_gps_warning_cooldowns: dict = {}


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
        import time
        from services.audit_logger import get_request_id
        
        start_time = time.monotonic()
        request_id = get_request_id()

        is_v2 = (hash(order_id) % 10 == 0)
        if is_v2:
            logger.info(f"[AB-TEST] Matching v2 selected for order {order_id}")

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
            
            # 2. Batch fetch driver locations to avoid N+1 query issue
            driver_ids = [d.id for d in drivers]
            db_locations = loc_repo.get_for_drivers(driver_ids)
            loc_map = {loc.driver_id: loc for loc in db_locations}
            
            candidates = []
            for driver in drivers:
                loc = loc_map.get(driver.id)
                d_lat, d_lng = None, None
                if loc:
                    d_lat, d_lng = float(loc.lat), float(loc.lng)
                else:
                    redis = getattr(current_app, "redis", None)
                    last_loc = None
                    if redis and hasattr(redis, "locations") and redis.locations:
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
                    # Send in-app notification & SMS warning to driver with 1-hour cooldown
                    redis = getattr(current_app, "redis", None)
                    cooldown_key = f"driver:{driver.id}:gps_warn_cooldown"
                    should_warn = True
                    now_ts = time.monotonic()

                    if redis and hasattr(redis, "cache") and redis.cache:
                        try:
                            if redis.cache.get(cooldown_key):
                                should_warn = False
                            else:
                                redis.cache.set(cooldown_key, "1", ttl=3600)
                        except Exception:
                            should_warn = (_gps_warning_cooldowns.get(driver.id, 0) < now_ts)
                            if should_warn:
                                _gps_warning_cooldowns[driver.id] = now_ts + 3600.0
                    else:
                        if _gps_warning_cooldowns.get(driver.id, 0) > now_ts:
                            should_warn = False
                        else:
                            _gps_warning_cooldowns[driver.id] = now_ts + 3600.0

                    if should_warn:
                        from routes.notifications import push_notification
                        from tasks.notify import send_sms
                        try:
                            push_notification(
                                user_id=driver.id,
                                type_="gps_warning",
                                title="GPS Location Required",
                                body="You are online but we cannot detect your GPS. Please turn on location services on your device to start receiving orders.",
                                icon="bell",
                                link="/settings"
                            )
                            send_sms.delay(
                                to=driver.phone,
                                body="🐺 Wolfie: You are online but we cannot detect your GPS location. Please turn on location services on your device to receive orders."
                            )
                            logger.info(f"Sent GPS activation notification and SMS to driver {driver.id}")
                        except Exception as ex:
                            logger.warning(f"Could not notify driver {driver.id} about missing GPS: {ex}")

            # Fetch order to check items count for vehicle restrictions
            from database.schemas import Order as OrderModel
            order = session.query(OrderModel).filter(OrderModel.id == order_id).first()
            item_count = sum(item.get("quantity", 1) for item in order.items) if order and order.items else 0

            # Filter candidates with valid coordinates within maximum dispatch radius (default 15.0 km) and apply Hard Rules
            max_radius_km = float(self.config.get("MATCHING_MAX_RADIUS_KM", 15.0))
            valid_candidates = []
            for c in candidates:
                if c["lat"] is None or c["lng"] is None:
                    continue
                if c["h_dist"] > max_radius_km:
                    continue

                driver = c["driver"]
                v_type = getattr(driver, "vehicle_type", "scooter") or "scooter"

                # Apply Hard Rules
                if v_type == "walker":
                    if c["h_dist"] > 4.0:
                        logger.info(f"SmartMatching: driver {driver.id} (walker) excluded due to distance {c['h_dist']}km > 4km")
                        continue
                    if item_count > 10:
                        logger.info(f"SmartMatching: driver {driver.id} (walker) excluded due to items count {item_count} > 10")
                        continue
                elif v_type == "bike":
                    if item_count > 10:
                        logger.info(f"SmartMatching: driver {driver.id} (bike) excluded due to items count {item_count} > 10")
                        continue

                valid_candidates.append(c)

            if not valid_candidates:
                logger.info(f"SmartMatching: no eligible drivers with valid locations within {max_radius_km}km")
                return None

            # Sort by Haversine distance and select top candidates
            valid_candidates.sort(key=lambda x: x["h_dist"])
            top_n = min(self.config.get("MATCHING_TOP_CANDIDATES", 9), 9)
            top_candidates = valid_candidates[:top_n]

            # 3. Call Mapbox Matrix API for actual traffic durations & driving distances
            fallback_used = False
            
            best_driver = None
            best_score = float("inf")
            
            sources = [{"lat": c["lat"], "lng": c["lng"]} for c in top_candidates]
            destinations = [{"lat": p_lat, "lng": p_lng}]
            
            try:
                matrix = None
                if hasattr(self.mapbox, "traffic_matrix"):
                    try:
                        res = self.mapbox.traffic_matrix(sources, destinations)
                        if isinstance(res, list) and res and isinstance(res[0], list) and isinstance(res[0][0], dict):
                            matrix = res
                    except Exception:
                        matrix = None

                if matrix is None:
                    matrix = self.mapbox.distance_matrix(sources, destinations)

                # Score drivers using live traffic ETA + distance + rating bonus + vehicle preference bonus
                scored_count = min(len(top_candidates), len(matrix))
                for idx in range(scored_count):
                    raw_val = matrix[idx][0]
                    c = top_candidates[idx]
                    driver = c["driver"]
                    rating = float(driver.rating or 5.0)
                    rating_weight = 0.5 if is_v2 else 0.3

                    if isinstance(raw_val, dict):
                        dist_km = float(raw_val.get("distance_km", 999.0))
                        duration_min = float(raw_val.get("duration_min", dist_km * 3.0))
                        eta_source = "mapbox"
                    elif isinstance(raw_val, (int, float)):
                        dist_km = float(raw_val)
                        duration_min = dist_km * 3.0
                        eta_source = "estimated"
                    else:
                        dist_km = 999.0
                        duration_min = 999.0
                        eta_source = "estimated"

                    # Calculate vehicle preference bonus
                    v_type = getattr(driver, "vehicle_type", "scooter") or "scooter"
                    vehicle_bonus = 0.0
                    if dist_km < 1.0:
                        if v_type == "walker":
                            vehicle_bonus = 2.0
                        elif v_type == "bike":
                            vehicle_bonus = 1.0
                        elif v_type == "scooter":
                            vehicle_bonus = 0.5
                    elif 1.0 <= dist_km <= 4.0:
                        if v_type == "scooter":
                            vehicle_bonus = 1.5
                        elif v_type == "bike":
                            vehicle_bonus = 1.0
                        elif v_type == "car":
                            vehicle_bonus = 0.5
                    else:
                        if v_type in ("car", "scooter"):
                            vehicle_bonus = 1.5
                        elif v_type == "bike":
                            vehicle_bonus = 0.5

                    if dist_km == 999.0:
                        score = 999.0
                    else:
                        score = (duration_min * 0.70) + (dist_km * 0.30) - (rating * rating_weight) - vehicle_bonus
                    
                    if score < best_score:
                        best_score = score
                        best_driver = {
                            "id": driver.id,
                            "name": driver.full_name,
                            "phone": driver.phone,
                            "rating": driver.rating,
                            "distance_km": round(dist_km, 2),
                            "eta_minutes": round(duration_min, 1),
                            "eta_source": eta_source
                        }
            except Exception as e:
                logger.error(f"SmartMatching: Mapbox Matrix API failed: {e}. Falling back to straight-line Haversine distance.")
                fallback_used = True
                rating_weight = 0.5 if is_v2 else 0.3
                for c in top_candidates:
                    dist_km = c["h_dist"]
                    duration_min = dist_km * 3.0  # ~3 min/km baseline estimate in traffic
                    driver = c["driver"]
                    rating = float(driver.rating or 5.0)
                    eta_source = "estimated"
                    
                    # Calculate vehicle preference bonus
                    v_type = getattr(driver, "vehicle_type", "scooter") or "scooter"
                    vehicle_bonus = 0.0
                    if dist_km < 1.0:
                        if v_type == "walker":
                            vehicle_bonus = 2.0
                        elif v_type == "bike":
                            vehicle_bonus = 1.0
                        elif v_type == "scooter":
                            vehicle_bonus = 0.5
                    elif 1.0 <= dist_km <= 4.0:
                        if v_type == "scooter":
                            vehicle_bonus = 1.5
                        elif v_type == "bike":
                            vehicle_bonus = 1.0
                        elif v_type == "car":
                            vehicle_bonus = 0.5
                    else:
                        if v_type in ("car", "scooter"):
                            vehicle_bonus = 1.5
                        elif v_type == "bike":
                            vehicle_bonus = 0.5

                    score = (duration_min * 0.70) + (dist_km * 0.30) - (rating * rating_weight) - vehicle_bonus
                    
                    if score < best_score:
                        best_score = score
                        best_driver = {
                            "id": driver.id,
                            "name": driver.full_name,
                            "phone": driver.phone,
                            "rating": driver.rating,
                            "distance_km": round(dist_km, 2),
                            "eta_minutes": round(duration_min, 1),
                            "eta_source": eta_source
                        }

            execution_time_ms = int((time.monotonic() - start_time) * 1000)
            
            log_data = {
                "request_id": request_id,
                "execution_time_ms": execution_time_ms,
                "candidate_count": len(valid_candidates),
                "matched_driver_id": best_driver["id"] if best_driver else None,
                "fallback_used": fallback_used,
                "eta_source": best_driver.get("eta_source") if best_driver else "none"
            }
            logger.info(f"Structured matching result: {log_data}", extra=log_data)
            
            if best_driver:
                logger.info(f"Matched driver {best_driver['id']} for order {order_id} (dist={best_driver['distance_km']}km, source={best_driver['eta_source']})")
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
