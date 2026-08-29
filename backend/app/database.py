"""
SQLAlchemy async engine + session factory.
All database I/O uses async sessions via get_db() dependency.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# ── Engine ───────────────────────────────────────────────────────────────────
engine_kwargs = {"echo": settings.debug}
if not settings.database_url.startswith("sqlite"):
    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_recycle": 300,
    })

engine = create_async_engine(
    settings.database_url,
    **engine_kwargs,
)

# ── Session factory ───────────────────────────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,    # keep attributes accessible after commit
    autocommit=False,
    autoflush=False,
)


# ── Declarative base (shared by all ORM models) ───────────────────────────────
class Base(DeclarativeBase):
    pass


# ── FastAPI dependency ────────────────────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Yield an async DB session, commit on success, rollback on exception.
    Usage in routers:
        async def endpoint(db: AsyncSession = Depends(get_db)):
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
