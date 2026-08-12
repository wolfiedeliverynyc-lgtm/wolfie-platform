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
            logger.debug(f"In-memory weather cache HIT for {lat_rounded}, {lng_rounded}: {in_mem['weather_code']}")
            return in_mem["weather_code"]

        # 3. Call OpenWeather API
        try:
            url = (
                f"https://api.openweathermap.org/data/2.5/weather"
                f"?lat={lat_rounded}&lon={lng_rounded}"
                f"&appid={self.api_key}"
                f"&units=metric"
            )
            # Short timeout of 3s to prevent pricing API from hanging if OpenWeather is slow
            resp = requests.get(url, timeout=3)
            if resp.status_code == 200:
                data = resp.json()
                weather_info = data.get("weather", [{}])[0]
                weather_id = weather_info.get("id", 800)
                
                # Map OpenWeather codes to Wolfie codes
                # Thunderstorm (2xx) -> storm
                # Drizzle (3xx) & Rain (5xx) -> rain
                # Snow (6xx) -> snow
                weather_code = None
                if 200 <= weather_id < 300:
                    weather_code = "storm"
                elif 300 <= weather_id < 600:
                    weather_code = "rain"
                elif 600 <= weather_id < 700:
                    weather_code = "snow"

                logger.info(f"OpenWeather fetched for {lat_rounded}, {lng_rounded}: ID {weather_id} -> {weather_code}")

                # Cache result for 15 minutes (900 seconds)
                cache_data = {"weather_code": weather_code}
                try:
                    if redis:
                        redis.cache.set(cache_key, cache_data, ttl=900)
                except Exception as ce:
                    logger.warning(f"Redis weather cache write failed: {ce}")

                self._in_memory_cache[cache_key] = {
                    "weather_code": weather_code,
                    "exp": now + 900
                }
                return weather_code
            else:
                logger.warning(f"OpenWeather API returned status {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.error(f"Failed to fetch weather from OpenWeather: {e}")

        return None
