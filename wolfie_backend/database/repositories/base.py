"""
╔══════════════════════════════════════════════════════════════╗
║     WOLFIE DELIVERY — database/repositories/base.py          ║
║     Generic repository — CRUD + filtering + pagination       ║
╚══════════════════════════════════════════════════════════════╝
"""

from __future__ import annotations

import time
from typing import TypeVar, Generic, Type, Any
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from sqlalchemy.exc import NoResultFound, IntegrityError, SQLAlchemyError
from database.schemas import Base
from functools import wraps

T = TypeVar("T", bound=Base)
def with_telemetry(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.monotonic()
        try:
            return func(*args, **kwargs)
        finally:
            from services.metrics import dep_latency
            dep_latency.labels(service="database").observe(time.monotonic() - start)
    return wrapper


class BaseRepository(Generic[T]):
    """
    Generic repository — كل repository يرث منه.

    Usage:
        class UserRepository(BaseRepository[User]):
            model = User
    """

    model: Type[T] = None

    def __init__(self, session: Session):
        if self.model is None:
            raise NotImplementedError("Repository must define `model`")
        self.session = session

    def _translate_error(self, e: Exception) -> Exception:
        from services.error_handler import NotFoundError, ValidationError, WolfieError
        if isinstance(e, NoResultFound):
            return NotFoundError(str(e))
        if isinstance(e, IntegrityError):
            return ValidationError(str(e))
        if isinstance(e, SQLAlchemyError):
            return WolfieError(str(e), code=500)
        return e

    # ══════════════════════════════════════════
    # READ
    # ══════════════════════════════════════════

    @with_telemetry
    def get(self, record_id: str) -> T | None:
        return self.session.get(self.model, record_id)

    @with_telemetry
    def get_or_404(self, record_id: str) -> T:
        obj = self.session.get(self.model, record_id)
        if not obj:
            raise LookupError(f"{self.model.__name__} {record_id} not found")
        return obj

    @with_telemetry
    def get_for_update(self, record_id: str) -> T | None:
        """Pessimistic row locking for concurrency protection."""
        try:
            stmt = select(self.model).where(self.model.id == record_id).with_for_update()
            return self.session.scalar(stmt)
        except Exception:
            # Fallback for backends that don't support with_for_update
            return self.session.get(self.model, record_id)

    @with_telemetry
    def get_or_404_for_update(self, record_id: str) -> T:
        obj = self.get_for_update(record_id)
        if not obj:
            raise LookupError(f"{self.model.__name__} {record_id} not found")
        return obj

    @with_telemetry
    def find_by(self, **kwargs) -> T | None:
        stmt = select(self.model).filter_by(**kwargs)
        return self.session.scalar(stmt)

    @with_telemetry
    def find_all_by(self, **kwargs) -> list[T]:
        stmt = select(self.model).filter_by(**kwargs)
        return list(self.session.scalars(stmt).all())

    @with_telemetry
    def get_many(self, record_ids: list[str] | set[str]) -> list[T]:
        if not record_ids:
            return []
        stmt = select(self.model).where(self.model.id.in_(list(record_ids)))
        return list(self.session.scalars(stmt).all())

    @with_telemetry
    def list(
        self,
        filters: dict = None,
        order_by=None,
        desc: bool = True,
        limit: int = 50,
        offset: int = 0,
        options: list = None,
    ) -> list[T]:
        stmt = select(self.model)

        if options:
            stmt = stmt.options(*options)

        if filters:
            for attr, value in filters.items():
                col = getattr(self.model, attr, None)
                if col is not None:
                    stmt = stmt.where(col == value)

        if order_by is not None:
            col = getattr(self.model, order_by, None) if isinstance(order_by, str) else order_by
            if col is not None:
                stmt = stmt.order_by(col.desc() if desc else col.asc())

        stmt = stmt.limit(limit).offset(offset)
        return list(self.session.scalars(stmt).all())

    @with_telemetry
    def count(self, filters: dict = None) -> int:
        stmt = select(func.count()).select_from(self.model)
        if filters:
            for attr, value in filters.items():
                col = getattr(self.model, attr, None)
                if col is not None:
                    stmt = stmt.where(col == value)
        return self.session.scalar(stmt) or 0

    @with_telemetry
    def exists(self, **kwargs) -> bool:
        stmt = select(func.count()).select_from(self.model).filter_by(**kwargs)
        return (self.session.scalar(stmt) or 0) > 0

    # ══════════════════════════════════════════
    # WRITE
    # ══════════════════════════════════════════

    @with_telemetry
    def add(self, obj: T) -> T:
        try:
            self.session.add(obj)
            self.session.flush()
            return obj
        except Exception as e:
            raise self._translate_error(e)

    @with_telemetry
    def add_all(self, objects: list[T]) -> list[T]:
        try:
            self.session.add_all(objects)
            self.session.flush()
            return objects
        except Exception as e:
            raise self._translate_error(e)

    @with_telemetry
    def update(self, obj: T, **kwargs) -> T:
        try:
            for key, value in kwargs.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)
            self.session.flush()
            return obj
        except Exception as e:
            raise self._translate_error(e)

    @with_telemetry
    def delete(self, obj: T) -> None:
        try:
            if hasattr(obj, "is_active"):
                obj.is_active = False
                self.session.flush()
            elif hasattr(obj, "deleted_at"):
                from datetime import datetime, timezone
                obj.deleted_at = datetime.now(timezone.utc)
                self.session.flush()
            else:
                self.session.delete(obj)
                self.session.flush()
        except Exception as e:
            raise self._translate_error(e)

    @with_telemetry
    def delete_by_id(self, record_id: str) -> bool:
        try:
            obj = self.session.get(self.model, record_id)
            if not obj:
                return False
            self.delete(obj)
            return True
        except Exception as e:
            raise self._translate_error(e)

    # ══════════════════════════════════════════
    # HELPERS
    # ══════════════════════════════════════════

    def refresh(self, obj: T) -> T:
        self.session.refresh(obj)
        return obj

    def to_dict(self, obj: T, exclude: set = None) -> dict:
        """Convert SQLAlchemy model to dict, excluding sensitive fields."""
        exclude = exclude or set()
        from sqlalchemy import inspect
        mapper = inspect(obj.__class__)
        res = {}
        for attr in mapper.column_attrs:
            db_name = attr.columns[0].name
            if db_name in exclude:
                continue
            res[db_name] = getattr(obj, attr.key)
        return res

    def safe_dict(self, obj: T) -> dict:
        """Return a safe dictionary representation of the model object."""
        return self.to_dict(obj)
