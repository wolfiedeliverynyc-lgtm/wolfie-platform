"""
╔══════════════════════════════════════════════════════════════╗
║     WOLFIE DELIVERY — database/repositories/base.py          ║
║     Generic repository — CRUD + filtering + pagination       ║
╚══════════════════════════════════════════════════════════════╝
"""

from typing import TypeVar, Generic, Type, Any
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from database.schemas import Base

T = TypeVar("T", bound=Base)


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

    # ══════════════════════════════════════════
    # READ
    # ══════════════════════════════════════════

    def get(self, record_id: str) -> T | None:
        return self.session.get(self.model, record_id)

    def get_or_404(self, record_id: str) -> T:
        obj = self.get(record_id)
        if not obj:
            raise LookupError(f"{self.model.__name__} {record_id} not found")
        return obj

    def find_by(self, **kwargs) -> T | None:
        stmt = select(self.model).filter_by(**kwargs)
        return self.session.scalar(stmt)

    def find_all_by(self, **kwargs) -> list[T]:
        stmt = select(self.model).filter_by(**kwargs)
        return list(self.session.scalars(stmt).all())

    def list(
        self,
        filters: dict = None,
        order_by=None,
        desc: bool = True,
        limit: int = 50,
        offset: int = 0,
    ) -> list[T]:
        stmt = select(self.model)

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

    def count(self, filters: dict = None) -> int:
        stmt = select(func.count()).select_from(self.model)
        if filters:
            for attr, value in filters.items():
                col = getattr(self.model, attr, None)
                if col is not None:
                    stmt = stmt.where(col == value)
        return self.session.scalar(stmt) or 0

    def exists(self, **kwargs) -> bool:
        stmt = select(func.count()).select_from(self.model).filter_by(**kwargs)
        return (self.session.scalar(stmt) or 0) > 0

    # ══════════════════════════════════════════
    # WRITE
    # ══════════════════════════════════════════

    def add(self, obj: T) -> T:
        self.session.add(obj)
        self.session.flush()   # get ID without committing
        return obj

    def add_all(self, objects: list[T]) -> list[T]:
        self.session.add_all(objects)
        self.session.flush()
        return objects

    def update(self, obj: T, **kwargs) -> T:
        for key, value in kwargs.items():
            if hasattr(obj, key):
                setattr(obj, key, value)
        self.session.flush()
        return obj

    def delete(self, obj: T) -> None:
        self.session.delete(obj)
        self.session.flush()

    def delete_by_id(self, record_id: str) -> bool:
        obj = self.get(record_id)
        if not obj:
            return False
        self.delete(obj)
        return True

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
