"""
Application configuration — reads from .env via pydantic-settings.
All settings are typed; wrong .env values raise at startup, not at runtime.
"""

from functools import lru_cache
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────
    app_env: str = "development"
    debug: bool = True
    secret_key: str = "change_me_in_production"

    # ── Database (Supports SQLite & Supabase PostgreSQL) ──
    database_url: str = (
        "postgresql+asyncpg://examgen:examgen_secret@localhost:5432/examgen"
    )
    sync_database_url: str = (
        "postgresql+psycopg2://examgen:examgen_secret@localhost:5432/examgen"
    )

    # Supabase specific credentials (Optional)
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    @field_validator("database_url", mode="before")
    @classmethod
    def assemble_database_url(cls, v: str) -> str:
        if not v or not isinstance(v, str):
            return v
        # Normalize Supabase / Postgres URI for SQLAlchemy asyncpg
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        if v.startswith("postgresql://") and not v.startswith("postgresql+"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    # ── Redis ────────────────────────────────────────
    redis_url: str = "redis://:redis_secret@localhost:6379/0"

    # ── LLM ──────────────────────────────────────────
    llm_provider: str = "groq"          # groq | gemini | ollama

    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-20b"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"

    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"

    # ── Rate limiting / retries ───────────────────────
    llm_rate_limit_per_min: int = 10
    llm_max_retries: int = 2

    # ── SearXNG ──────────────────────────────────────
    searxng_base_url: str = "http://localhost:8080"

    # ── Document processing (Phase 3) ────────────────
    upload_dir: str = "/tmp/examgen_uploads"
    chunk_size: int = 512          # tokens per chunk (rough word count)
    chunk_overlap: int = 64        # overlap between consecutive chunks
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    embedding_dim: int = 384       # must match Vector(384) in db model
    # Redis TTL for cached parsed-doc text (seconds): 7 days
    doc_cache_ttl: int = 604800


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton — constructed once at startup."""
    return Settings()


# Module-level convenience alias used throughout the app
settings: Settings = get_settings()
