"""
╔══════════════════════════════════════════════════════════════╗
║     WOLFIE DELIVERY — database/__init__.py                   ║
╚══════════════════════════════════════════════════════════════╝

Usage:
    from database import init_db, transaction, get_db_session
    from database import UserRepository, OrderRepository
    from database.schemas import User, Order
"""

from database.session import (
    init_db,
    init_engine,
    create_tables,
    drop_tables,
    get_session,
    transaction,
    nested_transaction,
    get_db_session,
    health_check,
)

from database.repositories import (
    BaseRepository,
    UserRepository,
    OrderRepository,
)

from database import schemas

__all__ = [
    # session
    "init_db", "init_engine", "create_tables", "drop_tables",
    "get_session", "transaction", "nested_transaction",
    "get_db_session", "health_check",
    # repositories
    "BaseRepository", "UserRepository", "OrderRepository",
    # schemas
    "schemas",
]
