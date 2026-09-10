import logging
import ssl
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy import event
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

logger = logging.getLogger(__name__)


# ── Declarative base (shared by all ORM models) ───────────────────────────────
class Base(DeclarativeBase):
    pass


def _create_engine_and_session(url: str):
    kwargs = {"echo": settings.debug}
    if not url.startswith("sqlite"):
        # Configure SSL context for Supabase / PostgreSQL cloud connections
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        connect_args = {
            "ssl": ctx,
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
            "timeout": 2,
            "command_timeout": 4,
        }
        kwargs.update({
            "pool_pre_ping": True,
            "pool_recycle": 300,
            "pool_size": 5,
            "max_overflow": 2,
            "connect_args": connect_args,
        })
    else:
        # SQLite connection tuning: timeout and multi-threading
        kwargs.update({
            "connect_args": {"check_same_thread": False, "timeout": 20}
        })

    eng = create_async_engine(url, **kwargs)

    if url.startswith("sqlite"):
        # Configure high-performance WAL mode and foreign keys on every SQLite connection
        @event.listens_for(eng.sync_engine, "connect")
        def _set_sqlite_pragmas(dbapi_connection, connection_record):
            try:
                cursor = dbapi_connection.cursor()
                cursor.execute("PRAGMA journal_mode = WAL;")
                cursor.execute("PRAGMA synchronous = NORMAL;")
                cursor.execute("PRAGMA foreign_keys = ON;")
                cursor.execute("PRAGMA busy_timeout = 10000;")
                cursor.execute("PRAGMA cache_size = -64000;")
                cursor.close()
            except Exception as e:
                logger.debug("Failed to set SQLite PRAGMAs: %s", e)

    sm = async_sessionmaker(
        bind=eng,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    return eng, sm


# Initial engine and session factory
active_db_type: str = "postgresql" if not settings.database_url.startswith("sqlite") else "sqlite"
engine, AsyncSessionLocal = _create_engine_and_session(settings.database_url)


def fallback_to_local_sqlite():
    """Fallback cleanly to local SQLite if remote PostgreSQL is unreachable."""
    global engine, AsyncSessionLocal, active_db_type
    active_db_type = "sqlite (fallback)"
    logger.warning("[DATABASE] Remote DB unreachable. Switched to local SQLite: sqlite+aiosqlite:///./examgen.db")
    engine, AsyncSessionLocal = _create_engine_and_session("sqlite+aiosqlite:///./examgen.db")


def get_async_session() -> AsyncSession:
    """Return an async session from the currently active session factory."""
    global AsyncSessionLocal
    return AsyncSessionLocal()


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
