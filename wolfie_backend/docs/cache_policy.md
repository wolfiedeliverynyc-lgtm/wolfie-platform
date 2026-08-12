# 🐺 Wolfie Delivery — Cache Policy Documentation

This document outlines the caching architecture, policies, and operational details for the Wolfie Delivery backend. Caching is powered by Redis and is decoupled across isolated databases to ensure separation of concerns, high throughput, and robust performance under high traffic.

---

## 1. Redis Database Isolation Scheme

To optimize memory management and avoid interference between cache invalidation, rate limiting, and message queuing, Redis is divided into six logical databases:

| Database ID | Function | Component / Service | Description |
| :--- | :--- | :--- | :--- |
| **Redis DB 0** | Message Queue (MQ) | Socket.IO Scaling / Kombu | Pub/Sub channels for multi-worker WebSocket synchronization. |
| **Redis DB 1** | Application Cache | `CacheService` | JSON-serialized store for menus, restaurants, and user data. |
| **Redis DB 2** | Rate Limiting | `RateLimiter` | Sliding window rate limits for APIs and WebSocket events. |
| **Redis DB 3** | Session Storage | `SessionStore` | JWT metadata registry supporting immediate session revocation. |
| **Redis DB 4** | Location Cache | `DriverLocationCache` | Sub-second driver GPS coordinate storage (TTL 30s). |
| **Redis DB 5** | Async Task Queues | `TaskQueue` | FIFO queues for SMS notifications, email receipts, and payouts. |

---

## 2. Caching Policies and Key Reference

The following table summarizes every key pattern cached in **Redis DB 1 (Application Cache)** and **Redis DB 4 (Location Cache)**:

| Cache Key Pattern | DB | TTL | Invalidation Trigger | Cached Entity / Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `wolfie:cache:user:active:dict:{user_id}` | DB 1 | *None* | Explicit delete when user profile updates or availability changes. | User profile information dictionary used in hot authentication/authorization paths. |
| `wolfie:cache:restaurants:active:list` | DB 1 | 300s (5m) | Explicit delete when a restaurant is added, removed, or toggles status. | Catalog list of online/active restaurants displayed to customers. |
| `wolfie:cache:restaurant:{restaurant_id}:detail` | DB 1 | 300s (5m) | Explicit delete when a restaurant profile is updated. | High-frequency detail page of a single restaurant. |
| `wolfie:cache:menu:{restaurant_id}:{category_id}` | DB 1 | 300s (5m) | Prefix invalidation `menu:{restaurant_id}:*` on category/item changes. | Active menu catalog segments parsed by customers. |
| `wolfie:cache:order:{order_id}:detail` | DB 1 | 15s | Explicit delete on order update, driver response, or driver location pings. | Active order state and tracking details. |
| `wolfie:cache:idempotency:wap:{event}:{order_id}` | DB 1 | 86400s (24h) | Automatic TTL expiration. | Idempotency locks to prevent duplicate executions of webhooks/partner flows. |
| `wolfie:location:{driver_id}` | DB 4 | 30s | Overwritten on new GPS ping; automatic expiry sets driver offline. | Real-time GPS coordinate dictionary (`{lat, lng, order_id, ts}`). |
| `wolfie:cache:analytics:snapshot` | DB 1 | 1200s (20m) | Automatic TTL expiration / Periodic refresh task. | Business dashboard analytical counters and revenue aggregate snapshot. |

---

## 3. Invalidation Strategies

### 1. Time-To-Live (TTL) Expiry
For volatile or time-sensitive resources (e.g., active orders, analytics snapshots), Wolfie relies on Redis's native key expiration:
* **Order details** use a low **15-second TTL** to prevent customers from seeing stale statuses while minimizing DB load.
* **Analytics snapshots** use a **20-minute TTL** since dashboard metrics do not need real-time query accuracy.

### 2. Explicit Deletes (Write-Through / Eviction)
For objects where consistency is critical (e.g., restaurant settings, active user profiles), the cache is evicted immediately upon database writes:
* In `UserRepository.py`:
  ```python
  # Evicts cache on profile update
  current_app.redis.cache.delete(f"user:active:dict:{user_id}")
  ```
* In `RestaurantRepository.py` / `routes/restaurants.py`:
  ```python
  # Evicts single restaurant details and lists on update
  redis.cache.delete(f"restaurant:{restaurant_id}:detail")
  redis.cache.delete("restaurants:active:list")
  ```

### 3. Prefix Invalidation
When hierarchical relationships exist (such as menu items belonging to category nodes inside a restaurant catalog), updating any single item invalidates the entire branch. The `CacheService.invalidate_prefix(prefix)` wrapper executes this eviction using Redis `KEYS`:
```python
# Evicts all menu pages/categories for a restaurant
redis.cache.invalidate_prefix(f"menu:{restaurant_id}:")
```

---

## 4. Operational Guidelines for Developers

1. **JSON Serialization**: `CacheService` handles serialization/deserialization transparently using standard `json.dumps`/`json.loads`. Ensure all cached classes/dictionaries consist of JSON-serializable primitives.
2. **Never Cache DB Session Objects**: Only cache data transfer objects (DTOs), dictionaries, or raw database strings. Caching SQLAlchemy instances bound to active transaction sessions causes synchronization faults.
3. **Graceful Fail-Open Policy**: Redis wrappers are wrapped inside `try-except` blocks. If Redis goes offline:
   * Cache hits degrade to database reads.
   * Rate limits fail-open to allow traffic through.
   * Centralized telemetry (Prometheus & Loki) records warning exceptions.
