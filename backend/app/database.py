import logging
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

logger = logging.getLogger(__name__)


# ── Declarative base (shared by all ORM models) ───────────────────────────────
class Base(DeclarativeBase):
    pass


def _create_engine_and_session(url: str):
    kwargs = {"echo": settings.debug}
    if not url.startswith("sqlite"):
        kwargs.update({
            "pool_pre_ping": True,
            "pool_recycle": 300,
            "connect_args": {"timeout": 3, "command_timeout": 6},
        })
    eng = create_async_engine(url, **kwargs)
    sm = async_sessionmaker(
        bind=eng,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    return eng, sm


# Initial engine and session factory
engine, AsyncSessionLocal = _create_engine_and_session(settings.database_url)


def fallback_to_local_sqlite():
    """Fallback cleanly to local SQLite if remote PostgreSQL is unreachable."""
    global engine, AsyncSessionLocal
    logger.warning("[DATABASE] Remote DB unreachable on this network. Switched to local SQLite: sqlite+aiosqlite:///./examgen.db")
    engine, AsyncSessionLocal = _create_engine_and_session("sqlite+aiosqlite:///./examgen.db")


# ── FastAPI dependency ────────────────────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Yield an async DB session, commit on success, rollback on exception.
    Dynamically uses the active sessionmaker.
    """
    global AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
