"""
╔══════════════════════════════════════════════════════════════╗
║  WOLFIE DELIVERY — services/metrics.py                       ║
║  System + Business + Latency Metrics for Prometheus          ║
╚══════════════════════════════════════════════════════════════╝

METRIC NAMESPACES:
  system_*    — CPU, RAM, Disk, Network
  redis_*     — Connection pool, latency, hit/miss
  db_*        — Pool size, query duration, slow queries
  wolfie_*    — Business metrics: orders, drivers, payments, matching
  ws_*        — WebSocket connections, events
  dep_*       — External dependency latency (Mapbox, Stripe, Gemini)
"""
import os
import time
import psutil
from prometheus_client import Gauge, Histogram, Counter

# ══════════════════════════════════════════════════════════════
# SYSTEM METRICS
# ══════════════════════════════════════════════════════════════
system_cpu        = Gauge("system_cpu_usage_percent",        "Container CPU usage percent")
system_ram        = Gauge("system_memory_usage_percent",     "Container memory usage percent")
system_disk       = Gauge("system_disk_usage_percent",       "Container disk usage percent")
system_net_sent   = Gauge("system_network_sent_bytes",       "Network bytes sent")
system_net_recv   = Gauge("system_network_received_bytes",   "Network bytes received")
system_open_fds   = Gauge("system_open_file_descriptors",    "Number of open file descriptors/handles")
system_uptime     = Gauge("system_uptime_seconds",           "Application uptime in seconds")

app_start_time = time.time()


# ══════════════════════════════════════════════════════════════
# REDIS METRICS  (includes Hit/Miss — Observation 4 of Redis)
# ══════════════════════════════════════════════════════════════
redis_mem           = Gauge("redis_used_memory_bytes",      "Redis used memory in bytes")
redis_clients       = Gauge("redis_connected_clients",      "Redis connected clients count")
redis_ping_latency  = Gauge("redis_latency_seconds",        "Redis ping latency in seconds")
redis_queue_size    = Gauge("redis_queue_size_total",       "Celery queue size in Redis")
redis_hits          = Counter("redis_cache_hits_total",     "Total Redis cache hits")
redis_misses        = Counter("redis_cache_misses_total",   "Total Redis cache misses")
redis_keyspace      = Gauge("redis_keyspace_keys_total",    "Total keys in Redis keyspace")


# ══════════════════════════════════════════════════════════════
# DATABASE METRICS
# ══════════════════════════════════════════════════════════════
db_pool_size        = Gauge("db_pool_size",             "SQLAlchemy connection pool size")
db_pool_checked_out = Gauge("db_pool_checked_out",      "SQLAlchemy active connections checked out")
db_pool_overflow    = Gauge("db_pool_overflow",         "SQLAlchemy pool overflow connections")
db_query_duration   = Histogram("db_query_duration_seconds", "Database query duration in seconds",
                                 buckets=(0.01, 0.05, 0.1, 0.3, 0.5, 1.0, 3.0))
db_slow_queries     = Counter("db_slow_queries_total",  "Total database queries taking longer than 500ms")


# ══════════════════════════════════════════════════════════════
# BUSINESS METRICS  (Observation 1+2 — labeled Counters)
# ══════════════════════════════════════════════════════════════
wolfie_orders_total = Counter(
    "wolfie_orders_total",
    "Total orders created by status",
    ["status"]              # labels: new | accepted | completed | cancelled
)
wolfie_driver_acceptances_total = Counter(
    "wolfie_driver_acceptances_total",
    "Driver assignment responses",
    ["result"]              # labels: accepted | rejected | timeout
)
wolfie_payment_total = Counter(
    "wolfie_payment_total",
    "Payment outcomes",
    ["result"]              # labels: success | failed | refunded
)

# Gauges for live state
wolfie_drivers_online       = Gauge("wolfie_drivers_online_total",     "Number of currently online drivers")
wolfie_orders_pending       = Gauge("wolfie_orders_pending_total",     "Number of orders awaiting driver assignment")


# ══════════════════════════════════════════════════════════════
# API & OPERATION LATENCY  (Observation 3 external, 4 histograms)
# ══════════════════════════════════════════════════════════════
_LATENCY_BUCKETS = (0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0)

api_request_duration = Histogram(
    "wolfie_api_request_duration_seconds",
    "End-to-end HTTP request latency",
    ["method", "endpoint", "status"],
    buckets=_LATENCY_BUCKETS
)
matching_duration = Histogram(
    "wolfie_matching_duration_seconds",
    "Time to find and assign the best driver",
    buckets=_LATENCY_BUCKETS
)
payment_duration = Histogram(
    "wolfie_payment_duration_seconds",
    "Time to complete a payment transaction",
    buckets=_LATENCY_BUCKETS
)
dispatch_duration = Histogram(
    "wolfie_dispatch_duration_seconds",
    "Total dispatch cycle time (match + notify)",
    buckets=_LATENCY_BUCKETS
)

# External dependency latency  (Observation 3)
dep_latency = Histogram(
    "wolfie_dependency_latency_seconds",
    "External partner API call latency",
    ["service"],            # labels: mapbox | stripe | gemini | redis | db
    buckets=_LATENCY_BUCKETS
)


# ══════════════════════════════════════════════════════════════
# WEBSOCKET METRICS  (realtime.py Observation 7)
# ══════════════════════════════════════════════════════════════
ws_connections_active  = Gauge("ws_connections_active",       "Active WebSocket connections")
ws_events_total        = Counter("ws_events_total",           "Total WebSocket events emitted", ["event"])
ws_reconnections_total = Counter("ws_reconnections_total",    "Total WebSocket reconnection attempts")


# ══════════════════════════════════════════════════════════════
# WAP HOOK METRICS  (hooks_wap.py telemetry)
# ══════════════════════════════════════════════════════════════
wap_hook_executions = Counter(
    "wolfie_wap_hook_executions_total",
    "Total WAP hook executions",
    ["event", "status"]       # status: success | failure | idempotent_skip
)
wap_hook_duration = Histogram(
    "wolfie_wap_hook_duration_seconds",
    "WAP hook execution duration in seconds",
    ["event"],
    buckets=_LATENCY_BUCKETS
)



# ══════════════════════════════════════════════════════════════
# UPDATE FUNCTIONS
# ══════════════════════════════════════════════════════════════

def update_system_metrics():
    """Poll system resource metrics using psutil."""
    try:
        system_cpu.set(psutil.cpu_percent())
        mem  = psutil.virtual_memory()
        system_ram.set(mem.percent)
        disk = psutil.disk_usage("/")
        system_disk.set(disk.percent)

        net = psutil.net_io_counters()
        system_net_sent.set(net.bytes_sent)
        system_net_recv.set(net.bytes_recv)

        proc = psutil.Process()
        try:
            if hasattr(proc, "num_fds"):
                system_open_fds.set(proc.num_fds())
            else:
                system_open_fds.set(proc.num_handles())
        except Exception:
            pass

        system_uptime.set(time.time() - app_start_time)
    except Exception:
        pass


def update_redis_metrics(redis_inst):
    """Poll Redis info metrics if active (also updates hit/miss totals)."""
    if not redis_inst:
        return
    try:
        t0 = time.time()
        redis_inst.ping()
        redis_ping_latency.set(time.time() - t0)

        info = redis_inst.connection.info()
        redis_mem.set(info.get("used_memory", 0))
        redis_clients.set(info.get("connected_clients", 0))

        # Hit/miss totals from Redis info
        keyspace_hits   = info.get("keyspace_hits",   0)
        keyspace_misses = info.get("keyspace_misses", 0)
        # These are cumulative counters from Redis — set absolute value via _value
        # We expose them as Prometheus Counters: only increment if Redis resets
        try:
            redis_hits._metrics.get((), redis_hits._metrics)._value.set(keyspace_hits)
            redis_misses._metrics.get((), redis_misses._metrics)._value.set(keyspace_misses)
        except Exception:
            pass

        # Total keyspace count
        try:
            ks_info = redis_inst.connection.info("keyspace")
            total_keys = sum(v.get("keys", 0) for v in ks_info.values() if isinstance(v, dict))
            redis_keyspace.set(total_keys)
        except Exception:
            pass

        # Celery queue size
        try:
            q_len = redis_inst.connection.llen("celery")
            redis_queue_size.set(q_len)
        except Exception:
            redis_queue_size.set(0)

    except Exception:
        pass


def setup_db_metrics(engine, slow_query_threshold: float = 0.5):
    """Attach SQLAlchemy event listeners to measure query durations & track pool."""
    from sqlalchemy import event
    if engine is None:
        return

    @event.listens_for(engine, "before_cursor_execute")
    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        context._query_start_time = time.time()

    @event.listens_for(engine, "after_cursor_execute")
    def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        start_time = getattr(context, "_query_start_time", None)
        if start_time:
            duration = time.time() - start_time
            db_query_duration.observe(duration)
            dep_latency.labels(service="db").observe(duration)
            if duration > slow_query_threshold:
                db_slow_queries.inc()
                import logging
                logging.getLogger("wolfie.db").warning(
                    f"⚠️ SLOW QUERY: duration={duration:.4f}s | statement={statement} | parameters={parameters}"
                )

    @event.listens_for(engine.pool, "checkin")
    def on_checkin(dbapi_con, con_record):
        _update_pool_metrics(engine.pool)

    @event.listens_for(engine.pool, "checkout")
    def on_checkout(dbapi_con, con_record, con_proxy):
        _update_pool_metrics(engine.pool)


def _update_pool_metrics(pool):
    try:
        if not pool:
            return
        size = getattr(pool, "size", lambda: 0)
        if callable(size):
            size = size()
        db_pool_size.set(size)

        if hasattr(pool, "checkedin"):
            checked_in = pool.checkedin()
            db_pool_checked_out.set(size - checked_in)
        else:
            db_pool_checked_out.set(0)

        if hasattr(pool, "overflow"):
            db_pool_overflow.set(pool.overflow())
        else:
            db_pool_overflow.set(0)
    except Exception:
        pass


# ══════════════════════════════════════════════════════════════
# CONTEXT MANAGER: measure external service latency
# ══════════════════════════════════════════════════════════════

class measure_dep:
    """
    Context manager to measure and record latency for external dependency calls.

    Usage:
        with measure_dep("mapbox"):
            result = mapbox.distance_matrix(...)

        with measure_dep("stripe"):
            intent = stripe.PaymentIntent.create(...)
    """
    def __init__(self, service_name: str):
        self.service = service_name
        self._t0 = None

    def __enter__(self):
        self._t0 = time.monotonic()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._t0 is not None:
            elapsed = time.monotonic() - self._t0
            dep_latency.labels(service=self.service).observe(elapsed)
        return False  # Do not suppress exceptions
