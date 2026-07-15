"""
╔══════════════════════════════════════════════════════════════════════════════╗
║          WOLFIE DELIVERY — services/redis_service.py                        ║
║          Redis layer: SocketIO scaling · cache · queues · sessions           ║
╚══════════════════════════════════════════════════════════════════════════════╝

WHY REDIS:
  ┌─────────────────────────────────────────────────────────────────┐
  │  Problem without Redis:                                         │
  │                                                                 │
  │  Worker 1 ──── Customer A                                       │
  │  Worker 2 ──── Driver B   ← sends location update              │
  │                                                                 │
  │  Customer A never receives it — different worker, no shared     │
  │  message bus. Every WebSocket event dies in its own process.    │
  │                                                                 │
  │  Solution: Redis as message broker                              │
  │                                                                 │
  │  Worker 1 ──── Customer A  ←──┐                                │
  │  Worker 2 ──── Driver B ──────┼── Redis pub/sub ──►  all       │
  │  Worker 3 ──── Admin   ←──────┘                     workers    │
  └─────────────────────────────────────────────────────────────────┘

USAGE MAP:
  Redis DB 0  — SocketIO message queue (flask-socketio + kombu)
  Redis DB 1  — Application cache (pricing, routes, restaurant data)
  Redis DB 2  — Rate limiting
  Redis DB 3  — Session storage
  Redis DB 4  — Real-time driver locations (TTL 30s)
  Redis DB 5  — Task queues (notifications, payout processing)
"""

import json
import logging
import os
from datetime import timedelta
from functools import wraps
from typing import Any

logger = logging.getLogger("wolfie.redis")

# ── Optional import (graceful fallback if redis not installed) ────────────────
try:
    import redis
    from redis import Redis
    from redis.exceptions import RedisError
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("redis-py not installed — running without Redis")


# ══════════════════════════════════════════════════════════════════════════════
# 1. CONNECTION MANAGER
# ══════════════════════════════════════════════════════════════════════════════

class RedisManager:
    """
    Single connection pool shared across all Redis DBs.
    Lazy init — connects on first use.
    """

    def __init__(self, url: str = None):
        self._url  = url or os.getenv("REDIS_URL", "redis://localhost:6379")
        self._pool = None
        self._clients: dict[int, Any] = {}

    def _get_pool(self):
        if not REDIS_AVAILABLE:
            raise RuntimeError("redis-py not installed. Run: pip install redis")
        if self._pool is None:
            self._pool = redis.ConnectionPool.from_url(
                self._url,
                decode_responses = True,
                max_connections  = 20,
            )
            logger.info(f"✅ Redis pool created — {self._url.split('@')[-1]}")
        return self._pool

    def client(self, db: int = 0) -> "Redis":
        """Get a Redis client for the given DB number."""
        if db not in self._clients:
            self._clients[db] = redis.Redis(connection_pool=self._get_pool(), db=db)
        return self._clients[db]

    def ping(self) -> bool:
        try:
            self.client(0).ping()
            return True
        except Exception:
            return False

    def health(self) -> dict:
        try:
            info = self.client(0).info("server")
            return {
                "status":  "ok",
                "version": info.get("redis_version"),
                "uptime":  info.get("uptime_in_seconds"),
                "url":     self._url.split("@")[-1],   # hide password
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}


# ══════════════════════════════════════════════════════════════════════════════
# 2. CACHE  (DB 1)
# ══════════════════════════════════════════════════════════════════════════════

class CacheService:
    """
    JSON-serialized key-value cache with TTL.

    Usage:
        cache.set("pricing:rest_001", pricing_data, ttl=300)
        data = cache.get("pricing:rest_001")
        cache.delete("pricing:rest_001")
        cache.invalidate_prefix("pricing:")
    """

    PREFIX = "wolfie:cache:"

    def __init__(self, redis_manager: RedisManager):
        self._r = redis_manager.client(db=1)

    def _key(self, key: str) -> str:
        return f"{self.PREFIX}{key}"

    def get(self, key: str) -> Any | None:
        try:
            val = self._r.get(self._key(key))
            return json.loads(val) if val else None
        except Exception as e:
            logger.warning(f"Cache GET failed [{key}]: {e}")
            return None

    def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        """ttl in seconds. Default 5 minutes."""
        try:
            self._r.setex(self._key(key), ttl, json.dumps(value, default=str))
            return True
        except Exception as e:
            logger.warning(f"Cache SET failed [{key}]: {e}")
            return False

    def delete(self, key: str) -> bool:
        try:
            self._r.delete(self._key(key))
            return True
        except Exception as e:
            logger.warning(f"Cache DELETE failed [{key}]: {e}")
            return False

    def invalidate_prefix(self, prefix: str):
        """Delete all keys matching a prefix."""
        try:
            pattern = f"{self.PREFIX}{prefix}*"
            keys    = self._r.keys(pattern)
            if keys:
                self._r.delete(*keys)
                logger.info(f"Cache invalidated {len(keys)} keys matching '{prefix}*'")
        except Exception as e:
            logger.warning(f"Cache invalidate_prefix failed: {e}")

    def cached(self, key: str, ttl: int = 300):
        """
        Decorator for automatic caching.

        @cache.cached("restaurant_menu:{restaurant_id}", ttl=120)
        def get_menu(restaurant_id):
            return db.fetch(...)
        """
        def decorator(fn):
            @wraps(fn)
            def wrapper(*args, **kwargs):
                # resolve {param} placeholders in key
                resolved_key = key.format(**kwargs) if kwargs else key
                cached_val   = self.get(resolved_key)
                if cached_val is not None:
                    return cached_val
                result = fn(*args, **kwargs)
                if result is not None:
                    self.set(resolved_key, result, ttl)
                return result
            return wrapper
        return decorator


# ══════════════════════════════════════════════════════════════════════════════
# 3. RATE LIMITER  (DB 2)
# ══════════════════════════════════════════════════════════════════════════════

class RateLimiter:
    """
    Sliding window rate limiter using Redis INCR + EXPIRE.

    Usage:
        limiter = RateLimiter(redis_manager)
        ok, remaining = limiter.check("login:192.168.1.1", limit=5, window=60)
        if not ok:
            return jsonify({"error": "Too many requests"}), 429
    """

    PREFIX = "wolfie:rate:"

    def __init__(self, redis_manager: RedisManager):
        self._r = redis_manager.client(db=2)

    def check(self, key: str, limit: int, window: int) -> tuple[bool, int]:
        """
        Returns (allowed: bool, remaining: int).
        window = seconds.
        """
        full_key = f"{self.PREFIX}{key}"
        try:
            pipe   = self._r.pipeline()
            pipe.incr(full_key)
            pipe.expire(full_key, window)
            results = pipe.execute()
            count   = results[0]
            remaining = max(0, limit - count)
            return count <= limit, remaining
        except Exception as e:
            logger.warning(f"RateLimit check failed [{key}]: {e}")
            return True, limit   # fail open

    def reset(self, key: str):
        try:
            self._r.delete(f"{self.PREFIX}{key}")
        except Exception:
            pass


# ══════════════════════════════════════════════════════════════════════════════
# 4. SESSION STORE  (DB 3)
# ══════════════════════════════════════════════════════════════════════════════

class SessionStore:
    """
    Server-side sessions — stores JWT metadata for revocation support.
    Useful for logout-everywhere and token blacklisting.

    Usage:
        sessions.store(token_jti, user_id, role, ttl=86400)
        sessions.is_valid(token_jti)   → bool
        sessions.revoke(token_jti)
        sessions.revoke_all(user_id)
    """

    PREFIX = "wolfie:session:"
    INDEX  = "wolfie:user_sessions:"

    def __init__(self, redis_manager: RedisManager):
        self._r = redis_manager.client(db=3)

    def store(self, jti: str, user_id: str, role: str, ttl: int = 86400):
        key  = f"{self.PREFIX}{jti}"
        data = json.dumps({"user_id": user_id, "role": role})
        self._r.setex(key, ttl, data)
        self._r.sadd(f"{self.INDEX}{user_id}", jti)
        self._r.expire(f"{self.INDEX}{user_id}", ttl)

    def is_valid(self, jti: str) -> bool:
        """Returns False if token has been revoked."""
        try:
            return bool(self._r.exists(f"{self.PREFIX}{jti}"))
        except Exception:
            return True   # fail open

    def revoke(self, jti: str):
        self._r.delete(f"{self.PREFIX}{jti}")

    def revoke_all(self, user_id: str):
        """Logout everywhere — invalidates all tokens for a user."""
        jtis = self._r.smembers(f"{self.INDEX}{user_id}")
        if jtis:
            self._r.delete(*[f"{self.PREFIX}{jti}" for jti in jtis])
        self._r.delete(f"{self.INDEX}{user_id}")
        logger.info(f"Revoked {len(jtis)} sessions for user {user_id}")


# ══════════════════════════════════════════════════════════════════════════════
# 5. DRIVER LOCATION CACHE  (DB 4)
# ══════════════════════════════════════════════════════════════════════════════

class DriverLocationCache:
    """
    Sub-second driver location storage with 30s TTL.
    Faster than PostgreSQL for real-time GPS updates.

    Writes every GPS ping here (cheap).
    Persists to PostgreSQL every N pings or on order events (expensive).

    Usage:
        loc_cache.update("drv_001", 40.7128, -74.0060, order_id="ord_abc")
        loc = loc_cache.get("drv_001")
        # → {"lat": 40.7128, "lng": -74.0060, "order_id": "...", "ts": "..."}
    """

    PREFIX = "wolfie:location:"
    TTL    = 30   # seconds — driver considered offline after this

    def __init__(self, redis_manager: RedisManager):
        self._r = redis_manager.client(db=4)

    def update(self, driver_id: str, lat: float, lng: float,
               order_id: str = None) -> bool:
        from datetime import datetime, timezone
        key  = f"{self.PREFIX}{driver_id}"
        data = json.dumps({
            "lat":      lat,
            "lng":      lng,
            "order_id": order_id,
            "ts":       datetime.now(timezone.utc).isoformat(),
        })
        try:
            self._r.setex(key, self.TTL, data)
            return True
        except Exception as e:
            logger.warning(f"DriverLocation cache update failed: {e}")
            return False

    def get(self, driver_id: str) -> dict | None:
        try:
            val = self._r.get(f"{self.PREFIX}{driver_id}")
            return json.loads(val) if val else None
        except Exception:
            return None

    def get_many(self, driver_ids: list[str]) -> dict[str, dict]:
        """Bulk fetch locations for multiple drivers."""
        if not driver_ids:
            return {}
        try:
            keys   = [f"{self.PREFIX}{did}" for did in driver_ids]
            values = self._r.mget(keys)
            result = {}
            for did, val in zip(driver_ids, values):
                if val:
                    result[did] = json.loads(val)
            return result
        except Exception:
            return {}

    def is_online(self, driver_id: str) -> bool:
        try:
            return bool(self._r.exists(f"{self.PREFIX}{driver_id}"))
        except Exception:
            return False

    def get_all_online(self) -> dict[str, dict]:
        """Get all drivers that have sent a location in the last 30s."""
        try:
            keys = self._r.keys(f"{self.PREFIX}*")
            if not keys:
                return {}
            values = self._r.mget(keys)
            result = {}
            for key, val in zip(keys, values):
                if val:
                    driver_id = key.replace(self.PREFIX, "")
                    result[driver_id] = json.loads(val)
            return result
        except Exception:
            return {}


# ══════════════════════════════════════════════════════════════════════════════
# 6. TASK QUEUE  (DB 5)
# ══════════════════════════════════════════════════════════════════════════════

class TaskQueue:
    """
    Simple Redis-backed FIFO queue for async tasks.
    Lightweight alternative to Celery for Wolfie's scale.

    Queues:
      wolfie:queue:notifications   — SMS / push alerts
      wolfie:queue:payouts         — driver + restaurant payout creation
      wolfie:queue:emails          — order receipts

    Usage:
        queue.push("notifications", {"type": "sms", "to": "+1...", "body": "..."})
        task = queue.pop("notifications")
    """

    PREFIX = "wolfie:queue:"

    QUEUES = ["notifications", "payouts", "emails"]

    def __init__(self, redis_manager: RedisManager):
        self._r = redis_manager.client(db=5)

    def push(self, queue: str, task: dict) -> bool:
        from datetime import datetime, timezone
        task["queued_at"] = datetime.now(timezone.utc).isoformat()
        try:
            self._r.rpush(f"{self.PREFIX}{queue}", json.dumps(task))
            return True
        except Exception as e:
            logger.error(f"Queue push failed [{queue}]: {e}")
            return False

    def pop(self, queue: str, timeout: int = 0) -> dict | None:
        """
        Blocking pop (timeout=0 = block forever).
        Use timeout>0 in worker loops.
        """
        try:
            result = self._r.blpop(f"{self.PREFIX}{queue}", timeout=timeout)
            if result:
                _, raw = result
                return json.loads(raw)
            return None
        except Exception as e:
            logger.error(f"Queue pop failed [{queue}]: {e}")
            return None

    def pop_nowait(self, queue: str) -> dict | None:
        """Non-blocking pop."""
        try:
            raw = self._r.lpop(f"{self.PREFIX}{queue}")
            return json.loads(raw) if raw else None
        except Exception:
            return None

    def size(self, queue: str) -> int:
        try:
            return self._r.llen(f"{self.PREFIX}{queue}")
        except Exception:
            return 0

    def sizes(self) -> dict[str, int]:
        return {q: self.size(q) for q in self.QUEUES}

    # ── Pre-built task helpers ────────────────

    def enqueue_sms(self, to: str, body: str):
        self.push("notifications", {"type": "sms", "to": to, "body": body})

    def enqueue_payout(self, order_id: str, driver_id: str,
                       restaurant_id: str, driver_amount: float,
                       restaurant_net: float, commission: float):
        self.push("payouts", {
            "order_id":       order_id,
            "driver_id":      driver_id,
            "restaurant_id":  restaurant_id,
            "driver_amount":  driver_amount,
            "restaurant_net": restaurant_net,
            "commission":     commission,
        })

    def enqueue_rating_request(self, order_id: str, customer_id: str):
        self.push("notifications", {
            "type":        "rating_request",
            "order_id":    order_id,
            "customer_id": customer_id,
        })


# ══════════════════════════════════════════════════════════════════════════════
# 7. WOLFIE REDIS  — unified facade
# ══════════════════════════════════════════════════════════════════════════════

class WolfieRedis:
    """
    Single import for all Redis functionality.

    Usage in app.py:
        app.redis = WolfieRedis(url=config.REDIS_URL)

    Usage in routes:
        from flask import current_app
        redis = current_app.redis

        redis.cache.set("menu:rest_001", menu, ttl=120)
        redis.locations.update(driver_id, lat, lng)
        redis.queue.enqueue_sms("+1...", "Your order is ready!")
        redis.sessions.revoke_all(user_id)
    """

    def __init__(self, url: str = None):
        self._manager = RedisManager(url)

        self.cache     = CacheService(self._manager)
        self.limiter   = RateLimiter(self._manager)
        self.sessions  = SessionStore(self._manager)
        self.locations = DriverLocationCache(self._manager)
        self.queue     = TaskQueue(self._manager)

        logger.info("✅ WolfieRedis initialized")

    def ping(self) -> bool:
        return self._manager.ping()

    def health(self) -> dict:
        h = self._manager.health()
        h["queue_sizes"] = self.queue.sizes()
        return h

    def socketio_message_queue_url(self) -> str:
        """URL for Flask-SocketIO message queue (DB 0)."""
        return self._manager._url


# ══════════════════════════════════════════════════════════════════════════════
# 8. FLASK RATE LIMIT DECORATOR
# ══════════════════════════════════════════════════════════════════════════════

def rate_limit(limit: int, window: int, key_func=None):
    """
    Route decorator for rate limiting.

    Usage:
        @auth_bp.route("/login", methods=["POST"])
        @rate_limit(limit=5, window=60)   # 5 requests per minute per IP
        def login():
            ...
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            from flask import request, jsonify, current_app
            redis = getattr(current_app, "redis", None)
            if not redis:
                return fn(*args, **kwargs)   # no Redis → skip

            if key_func:
                key = key_func()
            else:
                key = f"{fn.__name__}:{request.remote_addr}"

            allowed, remaining = redis.limiter.check(key, limit, window)
            if not allowed:
                return jsonify({
                    "error":       "Too many requests",
                    "retry_after": window,
                }), 429
            return fn(*args, **kwargs)
        return wrapper
    return decorator
