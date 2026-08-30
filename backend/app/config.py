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
        url = v.strip()
        # 1. Remove accidental placeholder brackets around password e.g. :[password]@ -> :password@
        import re, urllib.parse
        url = re.sub(r':\[(.*?)\]@', r':\1@', url)

        # 2. Fix unencoded '@' or special characters inside password
        # Pattern: scheme://user:password@host_and_port/db
        m = re.match(r'^(https?|postgres(?:ql)?(?:\+[a-z0-9]+)?):\/\/([^:]+):(.+)@([^@]+)$', url)
        if m:
            scheme, user, raw_pw, host_part = m.groups()
            # If already percent-encoded, do not double-encode
            if "%" not in raw_pw:
                encoded_pw = urllib.parse.quote_plus(raw_pw)
                url = f"{scheme}://{user}:{encoded_pw}@{host_part}"

        # 3. Normalize Supabase / Postgres URI for SQLAlchemy asyncpg
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        if url.startswith("postgresql://") and not url.startswith("postgresql+"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    # ── Redis ────────────────────────────────────────
    redis_url: str = "redis://:redis_secret@localhost:6379/0"

    # ── LLM ──────────────────────────────────────────
    llm_provider: str = "gemini"          # groq | gemini | ollama | openrouter

    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-20b"

    gemini_api_key: str = ""
    gemini_model: str = "models/gemini-3.5-flash-lite"

    openrouter_api_key: str = ""
    openrouter_model: str = "openrouter/free"

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
