import os
import time
import psutil
from prometheus_client import Gauge, Histogram, Counter
from sqlalchemy import event

# ── SYSTEM Resource Metrics ──────────────────────────────────
system_cpu = Gauge("system_cpu_usage_percent", "Container CPU usage percent")
system_ram = Gauge("system_memory_usage_percent", "Container memory usage percent")
system_disk = Gauge("system_disk_usage_percent", "Container disk usage percent")
system_net_sent = Gauge("system_network_sent_bytes", "Network bytes sent")
system_net_recv = Gauge("system_network_received_bytes", "Network bytes received")
system_open_fds = Gauge("system_open_file_descriptors", "Number of open file descriptors/handles")
system_uptime = Gauge("system_uptime_seconds", "Application uptime in seconds")

app_start_time = time.time()

# ── REDIS Metrics ───────────────────────────────────────────
redis_mem = Gauge("redis_used_memory_bytes", "Redis used memory in bytes")
redis_clients = Gauge("redis_connected_clients", "Redis connected clients count")
redis_ping_latency = Gauge("redis_latency_seconds", "Redis ping latency in seconds")
redis_queue_size = Gauge("redis_queue_size_total", "Celery queue size in Redis")

# ── DATABASE Metrics ────────────────────────────────────────
db_pool_size = Gauge("db_pool_size", "SQLAlchemy connection pool size")
db_pool_checked_out = Gauge("db_pool_checked_out", "SQLAlchemy active connections checked out")
db_pool_overflow = Gauge("db_pool_overflow", "SQLAlchemy pool overflow connections")
db_query_duration = Histogram("db_query_duration_seconds", "Database query duration in seconds", buckets=(0.01, 0.05, 0.1, 0.3, 0.5, 1.0, 3.0))
db_slow_queries = Counter("db_slow_queries_total", "Total database queries taking longer than 500ms")

def update_system_metrics():
    """Poll system resource metrics using psutil."""
    try:
        system_cpu.set(psutil.cpu_percent())
        mem = psutil.virtual_memory()
        system_ram.set(mem.percent)
        disk = psutil.disk_usage("/")
        system_disk.set(disk.percent)
        
        # Network
        net = psutil.net_io_counters()
        system_net_sent.set(net.bytes_sent)
        system_net_recv.set(net.bytes_recv)
        
        # Open handles / FDs
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
    """Poll Redis info metrics if active."""
    if not redis_inst:
        return
    try:
        # Measure latency
        t0 = time.time()
        redis_inst.ping()
        redis_ping_latency.set(time.time() - t0)
        
        # Read info
        info = redis_inst.connection.info()
        redis_mem.set(info.get("used_memory", 0))
        redis_clients.set(info.get("connected_clients", 0))
        
        # Celery queue size check (len of 'celery' list in Redis DB 0)
        try:
            q_len = redis_inst.connection.llen("celery")
            redis_queue_size.set(q_len)
        except Exception:
            redis_queue_size.set(0)
    except Exception:
        pass

def setup_db_metrics(engine):
    """Attach SQLAlchemy event listeners to measure query durations & track pool."""
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
            if duration > 0.5:
                db_slow_queries.inc()

    # Track Pool stats on connections checkout/checkin
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
        
        # Checked out connections calculation
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
