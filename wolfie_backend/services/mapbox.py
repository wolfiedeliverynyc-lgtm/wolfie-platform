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
            raise RuntimeError("Mapbox token is not configured. Cannot compute real route or coordinates.")

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
                f"{MAPBOX_BASE}/directions/v5/mapbox/driving-traffic/"
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
            d_parts  = destination.split(",")

            return {
                "distance_km":   dist_km,
                "duration_min":  dur_min,
                "pickup_coords": {"lat": float(o_parts[1]), "lng": float(o_parts[0])},
                "delivery_coords": {"lat": float(d_parts[1]), "lng": float(d_parts[0])},
                "geometry":      route.get("geometry"),
            }

        except Exception as e:
            logger.error(f"Mapbox get_route failed: {e}")
            raise RuntimeError(f"Could not compute route: {e}")

    # ── Geocode ───────────────────────────────

    def geocode(self, address: str) -> dict:
        """Forward geocode: address → {lat, lng}"""
        if self._mock:
            raise RuntimeError("Mapbox token is not configured. Cannot geocode real addresses.")

        try:
            encoded = requests.utils.quote(address)
            url     = (
                f"{MAPBOX_BASE}/geocoding/v5/mapbox.places/{encoded}.json"
                f"?access_token={self.token}&limit=1"
            )
            resp = requests.get(url, timeout=5)
            resp.raise_for_status()
            data    = resp.json()
            if not data.get("features"):
                raise ValueError(f"No geocoding results for address: {address}")
            feature = data["features"][0]
            coords  = feature["geometry"]["coordinates"]
            return {"lat": coords[1], "lng": coords[0], "place_name": feature["place_name"]}
        except Exception as e:
            logger.error(f"Mapbox geocode failed for '{address}': {e}")
            raise RuntimeError(f"Could not geocode address '{address}': {e}")

    # ── Reverse Geocode ───────────────────────

    def reverse_geocode(self, lat: float, lng: float) -> str:
        """Coordinates → address string"""
        if self._mock:
            return "Algiers Centre, Algiers"

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

    def resolve_zone(self, lat: float, lng: float) -> str:
        """Resolves the zone name dynamically using Mapbox geocoding features (neighborhood/locality/postcode)."""
        if self._mock:
            # Check if lat/lng is near El Kala (Algiers region coordinates used for testing)
            if 36.8 <= lat <= 36.95 and 8.3 <= lng <= 8.5:
                return "El Kala Center"
            # Brooklyn/NYC coordinates
            if 40.6 <= lat <= 40.85 and -74.15 <= lng <= -73.85:
                return "Williamsburg Central"
            return "Test Zone"

        try:
            url  = (
                f"{MAPBOX_BASE}/geocoding/v5/mapbox.places/{lng},{lat}.json"
                f"?access_token={self.token}&limit=1"
            )
            resp = requests.get(url, timeout=5)
            resp.raise_for_status()
            data = resp.json()
            if not data.get("features"):
                return "Unknown Zone"
                
            feature = data["features"][0]
            # Try to check if the feature itself is a neighborhood or locality
            place_type = feature.get("place_type", [])
            if "neighborhood" in place_type or "locality" in place_type:
                return feature.get("text", "Unknown Zone")

            # Check context
            context = feature.get("context", [])
            # Prefer neighborhood, then postcode, then locality/district, then place/city
            for c in context:
                cid = c.get("id", "")
                if cid.startswith("neighborhood"):
                    return c.get("text")
            for c in context:
                cid = c.get("id", "")
                if cid.startswith("postcode"):
                    return c.get("text")
            for c in context:
                cid = c.get("id", "")
                if cid.startswith("locality") or cid.startswith("district"):
                    return c.get("text")
            for c in context:
                cid = c.get("id", "")
                if cid.startswith("place"):
                    return c.get("text")

            return feature.get("text", "Unknown Zone")
        except Exception as e:
            logger.warning(f"Mapbox resolve_zone failed: {e}")
            return "Unknown Zone"

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
        if self._mock:
            raise ValueError("Mapbox token is not configured (mock mode active)")
        if not sources or not destinations:
            return []

        coords = ";".join(
            [f"{p['lng']},{p['lat']}" for p in sources + destinations]
        )
        n_src  = len(sources)
        src_idxs  = ";".join(str(i) for i in range(n_src))
        dest_idxs = ";".join(str(i + n_src) for i in range(len(destinations)))

        url = (
            f"{MAPBOX_BASE}/directions-matrix/v1/mapbox/driving-traffic/{coords}"
            f"?sources={src_idxs}&destinations={dest_idxs}"
            f"&annotations=distance"
            f"&access_token={self.token}"
        )
        resp = requests.get(url, timeout=8)
        resp.raise_for_status()
        data = resp.json()

        if "distances" not in data:
            raise KeyError("Mapbox directions-matrix API response is missing 'distances' field")

        # Convert meters to km
        return [
            [d / 1000 if d is not None else 999.0 for d in row]
            for row in data["distances"]
        ]

    # ── Geofence check ────────────────────────

    def is_in_brooklyn(self, lat: float, lng: float) -> bool:
        """Simple bounding box check for Algiers (formerly Brooklyn)"""
        return (
            36.7000 <= lat <= 36.8000 and
            2.9000 <= lng <= 3.2000
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
            "pickup_coords": {"lat": 36.7525, "lng": 3.0588},
            "delivery_coords": {"lat": 36.7275, "lng": 3.0861},
            "geometry":      None,
        }
