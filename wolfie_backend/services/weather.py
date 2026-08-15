"""
╔══════════════════════════════════════════════════════════════╗
║     WOLFIE DELIVERY — services/weather.py                     ║
║     Retrieves real-time weather and maps it to pricing codes  ║
╚══════════════════════════════════════════════════════════════╝
"""

import logging
import time
import requests

logger = logging.getLogger("wolfie")

class WeatherService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self._in_memory_cache = {}
        if api_key:
            logger.info("WeatherService: OpenWeather key configured")
        else:
            logger.warning("WeatherService: No OpenWeather key — running in mock/offline mode")

    def get_weather_code(self, lat: float, lng: float) -> str | None:
        """
        Retrieves weather code ('rain', 'snow', 'storm', or None) based on lat/lng.
        Checks Redis cache first, then in-memory cache, and falls back to API.
        
        Uses rounded coordinates (2 decimal places, ~1.1km precision) to group queries
        and maximize cache hits. Cache TTL is 15 minutes (900 seconds).
        """
        if not self.api_key:
            return None

        # Round to 2 decimal places to represent a ~1.1km zone
        lat_rounded = round(lat, 2)
        lng_rounded = round(lng, 2)
        cache_key = f"wolfie:weather:{lat_rounded}:{lng_rounded}"

        # 1. Try Redis Cache
        redis = None
        try:
            from flask import current_app
            redis = getattr(current_app, "redis", None)
            if redis:
                cached = redis.cache.get(cache_key)
                if cached is not None:
                    logger.debug(f"Redis weather cache HIT for {lat_rounded}, {lng_rounded}: {cached}")
                    return cached.get("weather_code")
        except Exception as e:
            logger.warning(f"Redis weather cache read failed: {e}")

        # 2. Try In-memory Cache fallback
        now = time.monotonic()
        in_mem = self._in_memory_cache.get(cache_key)
        if in_mem and now < in_mem["exp"]:
            logger.debug(f"In-memory weather cache HIT for {lat_rounded}, {lng_rounded}: {in_mem.get('weather_code')}")
            return in_mem.get("weather_code")

        # 3. Call OpenWeather API
        details = self.get_weather_details(lat, lng)
        return details.get("code") if details.get("code") in ["rain", "snow", "storm"] else None

    def get_weather_details(self, lat: float, lng: float) -> dict:
        """
        Retrieves rich weather details dictionary for UI badges and pricing info.
        Returns: {code, label, icon, temp_c, multiplier}
        """
        default_details = {
            "code": "clear",
            "label": "Clear",
            "icon": "☀️",
            "temp_c": None,
            "multiplier": 1.0
        }

        if not self.api_key:
            return default_details

        lat_rounded = round(lat, 2)
        lng_rounded = round(lng, 2)
        cache_key = f"wolfie:weather:details:{lat_rounded}:{lng_rounded}"

        # 1. Check Redis Cache
        redis = None
        try:
            from flask import current_app
            redis = getattr(current_app, "redis", None)
            if redis:
                cached = redis.cache.get(cache_key)
                if cached is not None:
                    return cached
        except Exception as e:
            logger.warning(f"Redis weather cache read failed: {e}")

        # 2. Check in-memory cache
        now = time.monotonic()
        in_mem = self._in_memory_cache.get(cache_key)
        if in_mem and now < in_mem["exp"]:
            return in_mem["data"]

        # 3. Fetch from OpenWeather API
        try:
            url = (
                f"https://api.openweathermap.org/data/2.5/weather"
                f"?lat={lat_rounded}&lon={lng_rounded}"
                f"&appid={self.api_key}"
                f"&units=metric"
            )
            resp = requests.get(url, timeout=3)
            if resp.status_code == 200:
                data = resp.json()
                weather_info = data.get("weather", [{}])[0]
                weather_id = weather_info.get("id", 800)
                main_desc = weather_info.get("main", "Clear")
                temp_c = round(data.get("main", {}).get("temp", 20.0), 1)

                code = "clear"
                label = "Clear"
                icon = "☀️"
                multiplier = 1.0

                if 200 <= weather_id < 300:
                    code = "storm"
                    label = "Thunderstorm"
                    icon = "⛈️"
                    multiplier = 1.30
                elif 300 <= weather_id < 600:
                    code = "rain"
                    label = "Rainy" if weather_id >= 500 else "Drizzle"
                    icon = "🌧️"
                    multiplier = 1.25
                elif 600 <= weather_id < 700:
                    code = "snow"
                    label = "Snowing"
                    icon = "❄️"
                    multiplier = 1.35
                elif 700 <= weather_id < 800:
                    code = "fog"
                    label = "Foggy / Mist"
                    icon = "🌫️"
                    multiplier = 1.10
                elif weather_id == 800:
                    code = "clear"
                    label = "Clear & Sunny"
                    icon = "☀️"
                    multiplier = 1.0
                elif weather_id > 800:
                    code = "clouds"
                    label = "Cloudy"
                    icon = "⛅"
                    multiplier = 1.0

                result = {
                    "code": code,
                    "label": label,
                    "icon": icon,
                    "temp_c": temp_c,
                    "multiplier": multiplier
                }

                # Cache in Redis and In-Memory
                try:
                    if redis:
                        redis.cache.set(cache_key, result, ttl=900)
                except Exception as ce:
                    logger.warning(f"Redis weather details write failed: {ce}")

                self._in_memory_cache[cache_key] = {
                    "data": result,
                    "exp": now + 900
                }
                return result
            else:
                logger.warning(f"OpenWeather API status {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.error(f"OpenWeather request failed: {e}")

        return default_details

