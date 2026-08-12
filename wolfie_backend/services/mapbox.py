"""
╔══════════════════════════════════════════════════════════════╗
║     WOLFIE DELIVERY — services/mapbox.py                     ║
║     Compatible with app.py (MapboxClient(token=...))         ║
╠══════════════════════════════════════════════════════════════╣
║  HARDENING:                                                  ║
║  ✅ Route caching (Redis → in-memory fallback), TTL 10 min   ║
║  ✅ Retry with exponential backoff (max 3 attempts)          ║
║  ✅ Explicit per-call timeout (5s routes / 8s matrix)        ║
║  ✅ Fallback for non-critical calls (reverse geocode / zone) ║
║  ✅ Latency telemetry via metrics.dep_latency                ║
╚══════════════════════════════════════════════════════════════╝
"""

import hashlib
import json
import logging
import time
from functools import lru_cache

import requests

logger = logging.getLogger("wolfie")

MAPBOX_BASE     = "https://api.mapbox.com"
_DEFAULT_TIMEOUT  = 5      # seconds for route / geocode
_MATRIX_TIMEOUT   = 8      # seconds for distance matrix
_MAX_RETRIES      = 3
_RETRY_BACKOFF    = 0.5    # seconds base (doubles each attempt)
_ROUTE_CACHE_TTL  = 600    # 10 minutes in seconds

# In-process LRU fallback when Redis is unavailable
_in_memory_cache: dict = {}


def _cache_key(*parts: str) -> str:
    raw = "|".join(str(p) for p in parts)
    return "wolfie:mapbox:" + hashlib.md5(raw.encode()).hexdigest()


def _cache_get(key: str) -> dict | None:
    """Try Redis first, fall back to in-process LRU."""
    try:
        from flask import current_app
        redis = getattr(current_app, "redis", None)
        if redis:
            val = redis.cache.get(key)
            if val:
                return val
    except RuntimeError:
        pass  # Outside app context — use in-process only

    entry = _in_memory_cache.get(key)
    if entry and time.monotonic() < entry["exp"]:
        return entry["val"]
    return None


def _cache_set(key: str, value: dict, ttl: int = _ROUTE_CACHE_TTL):
    """Write to Redis and in-process cache."""
    try:
        from flask import current_app
        redis = getattr(current_app, "redis", None)
        if redis:
            redis.cache.set(key, value, ttl=ttl)
    except RuntimeError:
        pass

    _in_memory_cache[key] = {"val": value, "exp": time.monotonic() + ttl}


def _request_with_retry(url: str, timeout: int = _DEFAULT_TIMEOUT) -> dict:
    """
    HTTP GET with retry (max _MAX_RETRIES) and exponential backoff.
    Raises RuntimeError if all attempts fail.
    """
    last_exc = None
    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            from services.metrics import dep_latency
            t0 = time.monotonic()
            resp = requests.get(url, timeout=timeout)
            dep_latency.labels(service="mapbox").observe(time.monotonic() - t0)
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.Timeout as e:
            last_exc = e
            logger.warning(f"Mapbox timeout (attempt {attempt}/{_MAX_RETRIES}): {url}")
        except requests.exceptions.HTTPError as e:
            # 5xx errors are retryable; 4xx are not
            if e.response is not None and e.response.status_code < 500:
                raise
            last_exc = e
            logger.warning(f"Mapbox HTTP error {e.response.status_code} (attempt {attempt}/{_MAX_RETRIES})")
        except Exception as e:
            last_exc = e
            logger.warning(f"Mapbox request failed (attempt {attempt}/{_MAX_RETRIES}): {e}")

        if attempt < _MAX_RETRIES:
            time.sleep(_RETRY_BACKOFF * (2 ** (attempt - 1)))

    raise RuntimeError(f"Mapbox API unavailable after {_MAX_RETRIES} attempts: {last_exc}")


class MapboxClient:

    def __init__(self, token: str):
        self.token = token
        if token:
            logger.info("MapboxClient: token configured")
        else:
            logger.warning("MapboxClient: No token — using mock mode")
        self._mock = not bool(token)

    # ── Route ─────────────────────────────────

    def get_route(self, origin: str, destination: str) -> dict:
        """
        origin/destination: "lat,lng" string OR address string.
        Returns: {distance_km, duration_min, pickup_coords, delivery_coords, geometry}

        ✅ Cached for 10 minutes per unique (origin, destination) pair.
        ✅ Retries up to 3 times on transient failures.
        """
        if self._mock:
            raise RuntimeError("Mapbox token is not configured. Cannot compute real route or coordinates.")

        # Resolve coords
        orig_coords  = self._resolve_coords(origin)
        dest_coords  = self._resolve_coords(destination)

        cache_key = _cache_key("route", orig_coords, dest_coords)
        cached = _cache_get(cache_key)
        if cached:
            logger.debug(f"Mapbox route cache HIT: {orig_coords} → {dest_coords}")
            return cached

        try:
            url = (
                f"{MAPBOX_BASE}/directions/v5/mapbox/driving-traffic/"
                f"{orig_coords};{dest_coords}"
                f"?access_token={self.token}"
                f"&overview=simplified&geometries=geojson"
            )
            data  = _request_with_retry(url, timeout=_DEFAULT_TIMEOUT)
            route = data["routes"][0]

            dist_km = round(route["distance"] / 1000, 2)
            dur_min = round(route["duration"] / 60, 1)
            o_parts = orig_coords.split(",")
            d_parts = dest_coords.split(",")

            result = {
                "distance_km":    dist_km,
                "duration_min":   dur_min,
                "pickup_coords":  {"lat": float(o_parts[1]), "lng": float(o_parts[0])},
                "delivery_coords": {"lat": float(d_parts[1]), "lng": float(d_parts[0])},
                "geometry":       route.get("geometry"),
            }
            _cache_set(cache_key, result, ttl=_ROUTE_CACHE_TTL)
            return result

        except Exception as e:
            logger.error(f"Mapbox get_route failed: {e}")
            raise RuntimeError(f"Could not compute route: {e}")

    # ── Geocode ───────────────────────────────

    def geocode(self, address: str) -> dict:
        """Forward geocode: address → {lat, lng}. Cached per address."""
        if self._mock:
            raise RuntimeError("Mapbox token is not configured. Cannot geocode real addresses.")

        cache_key = _cache_key("geocode", address)
        cached = _cache_get(cache_key)
        if cached:
            return cached

        try:
            encoded = requests.utils.quote(address)
            url = (
                f"{MAPBOX_BASE}/geocoding/v5/mapbox.places/{encoded}.json"
                f"?access_token={self.token}&limit=1"
            )
            data = _request_with_retry(url, timeout=_DEFAULT_TIMEOUT)
            if not data.get("features"):
                raise ValueError(f"No geocoding results for address: {address}")
            feature = data["features"][0]
            coords  = feature["geometry"]["coordinates"]
            result  = {"lat": coords[1], "lng": coords[0], "place_name": feature["place_name"]}
            _cache_set(cache_key, result, ttl=_ROUTE_CACHE_TTL)
            return result
        except Exception as e:
            logger.error(f"Mapbox geocode failed for '{address}': {e}")
            raise RuntimeError(f"Could not geocode address '{address}': {e}")

    # ── Reverse Geocode ───────────────────────

    def reverse_geocode(self, lat: float, lng: float) -> str:
        """Coordinates → address string. Non-critical: falls back to lat,lng string."""
        if self._mock:
            return "Algiers Centre, Algiers"

        cache_key = _cache_key("rev_geocode", lat, lng)
        cached = _cache_get(cache_key)
        if cached:
            return cached.get("place_name", f"{lat},{lng}")

        try:
            url = (
                f"{MAPBOX_BASE}/geocoding/v5/mapbox.places/{lng},{lat}.json"
                f"?access_token={self.token}&limit=1"
            )
            data   = _request_with_retry(url, timeout=_DEFAULT_TIMEOUT)
            result = data["features"][0]["place_name"]
            _cache_set(cache_key, {"place_name": result}, ttl=_ROUTE_CACHE_TTL)
            return result
        except Exception as e:
            logger.warning(f"Mapbox reverse_geocode failed (non-critical): {e}")
            return f"{lat},{lng}"   # safe fallback

    # ── Zone Resolver ─────────────────────────

    def resolve_zone(self, lat: float, lng: float) -> str:
        """Resolves zone name dynamically using Mapbox geocoding features. Non-critical."""
        if self._mock:
            if 36.8 <= lat <= 36.95 and 8.3 <= lng <= 8.5:
                return "El Kala Center"
            if 40.6 <= lat <= 40.85 and -74.15 <= lng <= -73.85:
                return "Williamsburg Central"
            return "Test Zone"

        cache_key = _cache_key("zone", lat, lng)
        cached = _cache_get(cache_key)
        if cached:
            return cached.get("zone", "Unknown Zone")

        try:
            url = (
                f"{MAPBOX_BASE}/geocoding/v5/mapbox.places/{lng},{lat}.json"
                f"?access_token={self.token}&limit=1"
            )
            data = _request_with_retry(url, timeout=_DEFAULT_TIMEOUT)
            if not data.get("features"):
                return "Unknown Zone"

            feature    = data["features"][0]
            place_type = feature.get("place_type", [])
            if "neighborhood" in place_type or "locality" in place_type:
                zone = feature.get("text", "Unknown Zone")
            else:
                context = feature.get("context", [])
                zone = "Unknown Zone"
                for prefix in ("neighborhood", "postcode", "locality", "district", "place"):
                    for c in context:
                        if c.get("id", "").startswith(prefix):
                            zone = c.get("text", "Unknown Zone")
                            break
                    if zone != "Unknown Zone":
                        break

            _cache_set(cache_key, {"zone": zone}, ttl=_ROUTE_CACHE_TTL)
            return zone
        except Exception as e:
            logger.warning(f"Mapbox resolve_zone failed (non-critical): {e}")
            return "Unknown Zone"

    # ── ETA ───────────────────────────────────

    def get_eta(self, driver_lat: float, driver_lng: float,
                dest_lat: float, dest_lng: float) -> int:
        """Returns ETA in minutes. Falls back to 20 min on failure."""
        try:
            result = self.get_route(
                f"{driver_lat},{driver_lng}",
                f"{dest_lat},{dest_lng}"
            )
            return int(result["duration_min"])
        except Exception:
            return 20   # safe fallback

    # ── Distance Matrix ───────────────────────

    def distance_matrix(self, sources: list, destinations: list) -> list:
        """
        sources/destinations: [{"lat":.., "lng":..}]
        Returns matrix of distances in km. Used by SmartMatchingEngine.
        ✅ Cached per unique sources/destinations combination.
        """
        if self._mock:
            raise ValueError("Mapbox token is not configured (mock mode active)")
        if not sources or not destinations:
            return []

        # Deterministic cache key from coords
        cache_key = _cache_key(
            "matrix",
            json.dumps(sources,      sort_keys=True),
            json.dumps(destinations, sort_keys=True),
        )
        cached = _cache_get(cache_key)
        if cached:
            logger.debug("Mapbox distance_matrix cache HIT")
            return cached.get("matrix", [])

        coords    = ";".join([f"{p['lng']},{p['lat']}" for p in sources + destinations])
        n_src     = len(sources)
        src_idxs  = ";".join(str(i) for i in range(n_src))
        dest_idxs = ";".join(str(i + n_src) for i in range(len(destinations)))

        url = (
            f"{MAPBOX_BASE}/directions-matrix/v1/mapbox/driving-traffic/{coords}"
            f"?sources={src_idxs}&destinations={dest_idxs}"
            f"&annotations=distance"
            f"&access_token={self.token}"
        )
        data = _request_with_retry(url, timeout=_MATRIX_TIMEOUT)

        if "distances" not in data:
            raise KeyError("Mapbox directions-matrix API response is missing 'distances' field")

        matrix = [
            [d / 1000 if d is not None else 999.0 for d in row]
            for row in data["distances"]
        ]
        _cache_set(cache_key, {"matrix": matrix}, ttl=_ROUTE_CACHE_TTL)
        return matrix

    # ── Geofence check ────────────────────────

    def is_in_brooklyn(self, lat: float, lng: float) -> bool:
        """Simple bounding box check for Algiers (formerly Brooklyn)."""
        return (
            36.7000 <= lat <= 36.8000 and
            2.9000  <= lng <= 3.2000
        )

    # ── Static map ────────────────────────────

    def static_map_url(self, lat: float, lng: float,
                       zoom: int = 14, width: int = 600, height: int = 400) -> str:
        return (
            f"{MAPBOX_BASE}/styles/v1/mapbox/dark-v11/static/"
            f"pin-s+FF4D00({lng},{lat})/{lng},{lat},{zoom}/"
            f"{width}x{height}?access_token={self.token}"
        )

    # ── Helpers ───────────────────────────────

    def _resolve_coords(self, value: str) -> str:
        """
        Takes "lat,lng" or address string.
        Returns Mapbox-format "lng,lat" string.
        """
        if self._is_coords(value):
            parts = value.split(",")
            return f"{parts[1]},{parts[0]}"   # flip to lng,lat
        geo = self.geocode(value)
        return f"{geo['lng']},{geo['lat']}"

    @staticmethod
    def _is_coords(s: str) -> bool:
        try:
            parts = s.split(",")
            if len(parts) != 2:
                return False
            float(parts[0])
            float(parts[1])
            return True
        except Exception:
            return False

    @staticmethod
    def _mock_route() -> dict:
        return {
            "distance_km":    2.3,
            "duration_min":   18,
            "pickup_coords":  {"lat": 36.7525, "lng": 3.0588},
            "delivery_coords": {"lat": 36.7275, "lng": 3.0861},
            "geometry":       None,
        }
