"""
╔══════════════════════════════════════════════════════════════╗
║     WOLFIE DELIVERY — migrations/env.py                      ║
║     Alembic environment — wired to SQLAlchemy schemas        ║
╚══════════════════════════════════════════════════════════════╝
"""

import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# ── Add project root to path ──────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# ── Load .env ─────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
except ImportError:
    pass

# ── Import SQLAlchemy metadata ────────────────────────────────
from database.schemas import Base

config      = context.config
target_metadata = Base.metadata

# ── Logging ───────────────────────────────────────────────────
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ── Database URL ──────────────────────────────────────────────
DATABASE_URL = (
    os.getenv("DATABASE_URL")
    or os.getenv("SUPABASE_DATABASE_URL")
    or "sqlite:///wolfie_dev.db"
)

config.set_main_option("sqlalchemy.url", DATABASE_URL)


# ══════════════════════════════════════════════════════════════
# OFFLINE (generate SQL without DB connection)
# ══════════════════════════════════════════════════════════════

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url                    = url,
        target_metadata        = target_metadata,
        literal_binds          = True,
        dialect_opts           = {"paramstyle": "named"},
        compare_type           = True,
        compare_server_default = True,
    )
    with context.begin_transaction():
        context.run_migrations()


# ══════════════════════════════════════════════════════════════
# ONLINE (run against live DB)
# ══════════════════════════════════════════════════════════════

def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix     = "sqlalchemy.",
        poolclass  = pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection             = connection,
            target_metadata        = target_metadata,
            compare_type           = True,
            compare_server_default = True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
