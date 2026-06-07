"""
╔══════════════════════════════════════════════════════════════╗
║     WOLFIE DELIVERY — database/session.py                    ║
║     Engine · Session factory · Transaction management        ║
╚══════════════════════════════════════════════════════════════╝
"""

import logging
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool, QueuePool
from database.schemas import Base

logger = logging.getLogger("wolfie")

_engine        = None
_SessionLocal  = None


# ══════════════════════════════════════════════════════════════
# ENGINE INIT
# ══════════════════════════════════════════════════════════════

def init_engine(database_url: str, testing: bool = False):
    """
    Call once at startup from app.py.

    Supabase (production):
        DATABASE_URL = postgresql://postgres:<password>@db.<project>.supabase.co:5432/postgres

    SQLite (testing / local dev without Supabase):
        DATABASE_URL = sqlite:///wolfie_test.db
    """
    global _engine, _SessionLocal

    is_sqlite = database_url.startswith("sqlite")

    engine_kwargs = {
        "echo":            False,
        "future":          True,
        "pool_pre_ping":   True,
    }

    if testing or is_sqlite:
        engine_kwargs["poolclass"]       = NullPool
        engine_kwargs["connect_args"]    = {"check_same_thread": False} if is_sqlite else {}
    else:
        # PostgreSQL / Supabase — connection pool
        engine_kwargs["poolclass"]       = QueuePool
        engine_kwargs["pool_size"]       = 5
        engine_kwargs["max_overflow"]    = 10
        engine_kwargs["pool_timeout"]    = 30
        engine_kwargs["pool_recycle"]    = 1800    # recycle every 30 min

    _engine = create_engine(database_url, **engine_kwargs)

    # SQLite: enable foreign keys (disabled by default)
    if is_sqlite:
        @event.listens_for(_engine, "connect")
        def set_sqlite_pragma(dbapi_conn, _):
            dbapi_conn.execute("PRAGMA foreign_keys=ON")

    _SessionLocal = sessionmaker(
        bind=_engine,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
    )

    logger.info(f"✅ DB engine ready — {database_url.split('@')[-1] if '@' in database_url else database_url}")
    return _engine


def create_tables():
    """Create all tables (dev/testing only — use migrations in production)."""
    if _engine is None:
        raise RuntimeError("Engine not initialized — call init_engine() first")
    Base.metadata.create_all(bind=_engine)
    logger.info("✅ All tables created")


def drop_tables():
    """Drop all tables (testing only)."""
    if _engine is None:
        raise RuntimeError("Engine not initialized")
    Base.metadata.drop_all(bind=_engine)
    logger.warning("⚠️ All tables dropped")


# ══════════════════════════════════════════════════════════════
# SESSION CONTEXT MANAGERS
# ══════════════════════════════════════════════════════════════

@contextmanager
def get_session() -> Generator[Session, None, None]:
    """
    Basic session — manual commit needed.

    Usage:
        with get_session() as session:
            user = session.get(User, user_id)
            session.commit()
    """
    if _SessionLocal is None:
        raise RuntimeError("DB not initialized — call init_engine() first")

    session = _SessionLocal()
    try:
        yield session
    finally:
        session.close()


@contextmanager
def transaction() -> Generator[Session, None, None]:
    """
    Auto-commit transaction — rolls back on any exception.

    Usage:
        with transaction() as session:
            session.add(user)
            session.add(order)
            # auto-commit if no exception
            # auto-rollback on exception
    """
    if _SessionLocal is None:
        raise RuntimeError("DB not initialized — call init_engine() first")

    session = _SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


@contextmanager
def nested_transaction(session: Session):
    """
    Savepoint inside an existing transaction.
    Use for partial rollbacks without losing the whole tx.

    Usage:
        with transaction() as session:
            session.add(order)
            with nested_transaction(session):
                session.add(payment)   # rolls back only this if it fails
    """
    savepoint = session.begin_nested()
    try:
        yield session
        savepoint.commit()
    except Exception:
        savepoint.rollback()
        raise


# ══════════════════════════════════════════════════════════════
# FLASK INTEGRATION
# ══════════════════════════════════════════════════════════════

def init_db(app):
    """
    Called from app.py create_app().
    Initializes engine from Flask config and attaches session factory.
    """
    from flask import g

    db_url = (
        app.config.get("DATABASE_URL")
        or _build_supabase_url(app)
        or "sqlite:///wolfie_dev.db"
    )

    testing = app.config.get("TESTING", False)
    engine  = init_engine(db_url, testing=testing)

    if testing or db_url.startswith("sqlite"):
        create_tables()

    # Attach session factory to app
    app.db_session = _SessionLocal

    # Per-request session via Flask's g
    @app.teardown_appcontext
    def close_session(_):
        session = g.pop("db_session", None)
        if session:
            session.close()

    logger.info(f"✅ DB initialized ({'testing' if testing else 'production'})")
    return engine


def _build_supabase_url(app) -> str | None:
    """Build PostgreSQL URL from Supabase config if DATABASE_URL not set."""
    url  = app.config.get("SUPABASE_URL")
    key  = app.config.get("SUPABASE_SERVICE_KEY") or app.config.get("SUPABASE_KEY")
    if url and key:
        # Supabase PostgreSQL direct connection
        project = url.replace("https://", "").replace(".supabase.co", "")
        return f"postgresql://postgres:{key}@db.{project}.supabase.co:5432/postgres"
    return None


def get_db_session() -> Session:
    """
    Get or create a per-request DB session (use in Flask routes).

    Usage in routes:
        from database.session import get_db_session
        session = get_db_session()
    """
    from flask import g
    if "db_session" not in g:
        if _SessionLocal is None:
            raise RuntimeError("DB not initialized")
        g.db_session = _SessionLocal()
    return g.db_session


def health_check() -> dict:
    """Check if DB is reachable."""
    try:
        with get_session() as session:
            session.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": str(e)}
