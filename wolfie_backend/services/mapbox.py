"""
╔══════════════════════════════════════════════════════════════╗
║     WOLFIE DELIVERY — mapbox_utils.py                        ║
║     Compatible with app.py (MapboxClient(token=...))        ║
╚══════════════════════════════════════════════════════════════╝
Expected interface by app.py:
    MapboxClient(token)
    .get_route(origin, destination) → {distance_km, duration_min, pickup_coords}
    .geocode(address) → {lat, lng}
"""

import logging
import requests

logger = logging.getLogger("wolfie")

MAPBOX_BASE = "https://api.mapbox.com"


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
        origin/destination: "lat,lng" string OR address string
        Returns: {distance_km, duration_min, pickup_coords, geometry}
        """
        if self._mock:
            return self._mock_route()

        try:
            # Geocode if address strings given
            if not self._is_coords(origin):
                o = self.geocode(origin)
                origin = f"{o['lng']},{o['lat']}"
            else:
                parts  = origin.split(",")
                origin = f"{parts[1]},{parts[0]}"   # mapbox wants lng,lat

            if not self._is_coords(destination):
                d           = self.geocode(destination)
                destination = f"{d['lng']},{d['lat']}"
            else:
                parts       = destination.split(",")
                destination = f"{parts[1]},{parts[0]}"

            url = (
                f"{MAPBOX_BASE}/directions/v5/mapbox/driving/"
                f"{origin};{destination}"
                f"?access_token={self.token}"
                f"&overview=simplified&geometries=geojson"
            )
            resp = requests.get(url, timeout=5)
            resp.raise_for_status()
            data  = resp.json()
            route = data["routes"][0]

            dist_km  = round(route["distance"] / 1000, 2)
            dur_min  = round(route["duration"] / 60, 1)
            o_parts  = origin.split(",")

            return {
                "distance_km":   dist_km,
                "duration_min":  dur_min,
                "pickup_coords": {"lat": float(o_parts[1]), "lng": float(o_parts[0])},
                "geometry":      route.get("geometry"),
            }

        except Exception as e:
            logger.warning(f"Mapbox get_route failed: {e} — using mock")
            return self._mock_route()

    # ── Geocode ───────────────────────────────

    def geocode(self, address: str) -> dict:
        """Forward geocode: address → {lat, lng}"""
        if self._mock:
            return {"lat": 40.7128, "lng": -74.0060}   # NYC default

        try:
            encoded = requests.utils.quote(address)
            url     = (
                f"{MAPBOX_BASE}/geocoding/v5/mapbox.places/{encoded}.json"
                f"?access_token={self.token}&limit=1"
                f"&proximity=-73.9566,40.7128"   # bias toward Brooklyn
            )
            resp = requests.get(url, timeout=5)
            resp.raise_for_status()
            data    = resp.json()
            feature = data["features"][0]
            coords  = feature["geometry"]["coordinates"]
            return {"lat": coords[1], "lng": coords[0], "place_name": feature["place_name"]}
        except Exception as e:
            logger.warning(f"Mapbox geocode failed: {e}")
            return {"lat": 40.7128, "lng": -74.0060}

    # ── Reverse Geocode ───────────────────────

    def reverse_geocode(self, lat: float, lng: float) -> str:
        """Coordinates → address string"""
        if self._mock:
            return "Brooklyn, New York, NY"

        try:
            url  = (
                f"{MAPBOX_BASE}/geocoding/v5/mapbox.places/{lng},{lat}.json"
                f"?access_token={self.token}&limit=1"
            )
            resp = requests.get(url, timeout=5)
            resp.raise_for_status()
            data = resp.json()
            return data["features"][0]["place_name"]
        except Exception as e:
            logger.warning(f"Mapbox reverse_geocode failed: {e}")
            return f"{lat},{lng}"

    # ── ETA ───────────────────────────────────

    def get_eta(self, driver_lat: float, driver_lng: float,
                dest_lat: float, dest_lng: float) -> int:
        """Returns ETA in minutes"""
        try:
            result = self.get_route(
                f"{driver_lat},{driver_lng}",
                f"{dest_lat},{dest_lng}"
            )
            return int(result["duration_min"])
        except Exception:
            return 20   # fallback 20 min

    # ── Distance Matrix ───────────────────────

    def distance_matrix(self, sources: list, destinations: list) -> list:
        """
        sources/destinations: [{"lat":..,"lng":..}]
        Returns matrix of distances in km.
        Used by SmartMatchingEngine.
        """
        if self._mock or not sources or not destinations:
            return [[2.0] * len(destinations) for _ in sources]

        try:
            coords = ";".join(
                [f"{p['lng']},{p['lat']}" for p in sources + destinations]
            )
            n_src  = len(sources)
            src_idxs  = ";".join(str(i) for i in range(n_src))
            dest_idxs = ";".join(str(i + n_src) for i in range(len(destinations)))

            url = (
                f"{MAPBOX_BASE}/directions-matrix/v1/mapbox/driving/{coords}"
                f"?sources={src_idxs}&destinations={dest_idxs}"
                f"&access_token={self.token}"
            )
            resp = requests.get(url, timeout=8)
            resp.raise_for_status()
            data = resp.json()

            # Convert meters to km
            return [
                [d / 1000 if d else 999 for d in row]
                for row in data["distances"]
            ]
        except Exception as e:
            logger.warning(f"distance_matrix failed: {e}")
            return [[2.0] * len(destinations) for _ in sources]

    # ── Geofence check ────────────────────────

    def is_in_brooklyn(self, lat: float, lng: float) -> bool:
        """Simple bounding box check for Brooklyn"""
        return (
            40.5700 <= lat <= 40.7390 and
            -74.0420 <= lng <= -73.8330
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

    @staticmethod
    def _is_coords(s: str) -> bool:
        try:
            parts = s.split(",")
            if len(parts) != 2:
                return False
            float(parts[0]); float(parts[1])
            return True
        except Exception:
            return False

    @staticmethod
    def _mock_route() -> dict:
        return {
            "distance_km":   2.3,
            "duration_min":  18,
            "pickup_coords": {"lat": 40.7128, "lng": -73.9866},
            "geometry":      None,
        }
