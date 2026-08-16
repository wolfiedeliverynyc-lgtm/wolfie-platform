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

def init_engine(
    database_url: str,
    testing: bool = False,
    pool_size: int = 5,
    max_overflow: int = 10,
    pool_timeout: int = 30,
    pool_recycle: int = 1800
):
    """
    Call once at startup from app.py.

    Supabase (production):
        DATABASE_URL = postgresql://postgres:<password>@db.<project>.supabase.co:5432/postgres

    SQLite (testing / local dev without Supabase):
        DATABASE_URL = sqlite:///wolfie_test.db
    """
    global _engine, _SessionLocal

    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

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
        engine_kwargs["pool_size"]       = pool_size
        engine_kwargs["max_overflow"]    = max_overflow
        engine_kwargs["pool_timeout"]    = pool_timeout
        engine_kwargs["pool_recycle"]    = pool_recycle

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


def ensure_schema_up_to_date(engine=None):
    """
    Ensure all tables and columns defined in SQLAlchemy models exist in the database.
    Performs non-destructive auto-migrations for missing columns across dialects.
    """
    eng = engine or _engine
    if eng is None:
        raise RuntimeError("Engine not initialized — call init_engine() first")

    from sqlalchemy import inspect, text
    Base.metadata.create_all(bind=eng)

    try:
        inspector = inspect(eng)
        for table_name, table in Base.metadata.tables.items():
            if not inspector.has_table(table_name):
                continue
            
            existing_cols = {c["name"] for c in inspector.get_columns(table_name)}
            for col in table.columns:
                if col.name not in existing_cols:
                    # Clean type resolution for PostgreSQL and SQLite
                    type_repr = str(col.type)
                    if "JSON" in type_repr:
                        col_type_str = "JSON" if eng.dialect.name == "sqlite" else "JSONB"
                    elif "Boolean" in type_repr:
                        col_type_str = "BOOLEAN"
                    elif "DateTime" in type_repr:
                        col_type_str = "TIMESTAMP WITH TIME ZONE" if eng.dialect.name == "postgresql" else "DATETIME"
                    elif "Integer" in type_repr:
                        col_type_str = "INTEGER"
                    elif "Float" in type_repr:
                        col_type_str = "DOUBLE PRECISION" if eng.dialect.name == "postgresql" else "REAL"
                    elif "Text" in type_repr:
                        col_type_str = "TEXT"
                    elif "Enum" in type_repr or "VARCHAR" in type_repr or "String" in type_repr:
                        col_type_str = "VARCHAR(255)"
                    else:
                        col_type_str = str(col.type.compile(eng.dialect))

                    # Execute each column alteration in its own isolated connection
                    try:
                        with eng.connect() as conn:
                            conn.execution_options(isolation_level="AUTOCOMMIT")
                            conn.execute(text(f'ALTER TABLE "{table_name}" ADD COLUMN IF NOT EXISTS "{col.name}" {col_type_str}'))
                            conn.commit()
                            logger.info(f"✅ Added missing column: {table_name}.{col.name} ({col_type_str})")
                    except Exception:
                        try:
                            with eng.connect() as conn:
                                conn.execution_options(isolation_level="AUTOCOMMIT")
                                conn.execute(text(f'ALTER TABLE "{table_name}" ADD COLUMN "{col.name}" {col_type_str}'))
                                conn.commit()
                                logger.info(f"✅ Added missing column: {table_name}.{col.name} ({col_type_str})")
                        except Exception as e:
                            logger.warning(f"Could not auto-add column {table_name}.{col.name}: {e}")
    except Exception as e:
        logger.warning(f"Schema inspection warning: {e}")


def create_tables():
    """Create all tables and ensure all columns exist."""
    if _engine is None:
        raise RuntimeError("Engine not initialized — call init_engine() first")
    ensure_schema_up_to_date(_engine)
    logger.info("✅ All tables and schema columns ensured")


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
    import os
    import shutil

    db_url = (
        app.config.get("DATABASE_URL")
        or _build_supabase_url(app)
        or "sqlite:///wolfie_dev.db"
    )

    is_sqlite = db_url.startswith("sqlite")
    is_prod = os.getenv("FLASK_ENV") == "production" or app.config.get("ENV") == "production"

    # Enforce PostgreSQL in production
    if is_prod and is_sqlite:
        raise RuntimeError("FATAL: SQLite is not allowed in production. Please configure DATABASE_URL to a valid PostgreSQL instance.")

    if is_sqlite:
        # On Render or Production, redirect SQLite database to writable /tmp folder
        if os.getenv("RENDER") == "true" or os.getenv("FLASK_ENV") == "production":
            src_db = db_url.replace("sqlite:///", "")
            # Ensure path is relative to current directory if not absolute
            if not os.path.isabs(src_db):
                src_db = os.path.join(os.getcwd(), src_db)
            
            dest_db = "/tmp/wolfie_dev.db"
            if not os.path.exists(dest_db):
                if os.path.exists(src_db):
                    shutil.copy(src_db, dest_db)
                    logger.info(f"Copied template SQLite database from {src_db} to {dest_db}")
                else:
                    logger.warning(f"Template SQLite database {src_db} not found to copy!")
            else:
                logger.info(f"Using existing writable SQLite database at {dest_db}")
            db_url = f"sqlite:///{dest_db}"

    testing = app.config.get("TESTING", False)
    pool_size = app.config.get("SQLALCHEMY_POOL_SIZE", 5)
    max_overflow = app.config.get("SQLALCHEMY_MAX_OVERFLOW", 10)
    pool_timeout = app.config.get("SQLALCHEMY_POOL_TIMEOUT", 30)
    pool_recycle = app.config.get("SQLALCHEMY_POOL_RECYCLE", 1800)
    engine  = init_engine(
        db_url,
        testing=testing,
        pool_size=pool_size,
        max_overflow=max_overflow,
        pool_timeout=pool_timeout,
        pool_recycle=pool_recycle
    )

    # Ensure all tables exist in all environments (uses safe CREATE TABLE IF NOT EXISTS)
    try:
        create_tables()
    except Exception as e:
        logger.error(f"⚠️ Failed to auto-create tables: {e}")

    # Auto-seed demo accounts if database is empty
    try:
        with get_session() as s:
            from database.schemas import User as UserModel
            if s.query(UserModel).count() == 0:
                logger.info("Empty database detected — auto-seeding demo accounts...")
                from seed_all_data import seed_initial_data
                seed_initial_data(s)
                s.commit()
                logger.info("✅ Demo accounts auto-seeded successfully")
    except Exception as e:
        logger.warning(f"Auto-seed check note: {e}")

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
    db_pass = os.getenv("SUPABASE_DB_PASSWORD") or os.getenv("DB_PASSWORD")
    if url and db_pass:
        # Supabase PostgreSQL direct connection using correct database password
        project = url.replace("https://", "").replace(".supabase.co", "")
        return f"postgresql://postgres:{db_pass}@db.{project}.supabase.co:5432/postgres"
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
        logger.exception("Database health check failed")
        try:
            import sentry_sdk
            sentry_sdk.capture_exception(e)
        except ImportError:
            pass
        return {"status": "error", "database": "unreachable"}
