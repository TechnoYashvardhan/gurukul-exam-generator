"""
FastAPI application entry point.
"""

import logging
import logging.config
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import generate, templates, documents

# ── Logging setup ─────────────────────────────────────────────────────────────
LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "default",
            "stream": "ext://sys.stdout",
        },
    },
    "loggers": {
        # Our app — verbose in dev, info in prod
        "app": {
            "handlers": ["console"],
            "level": "DEBUG" if settings.debug else "INFO",
            "propagate": False,
        },
        # SQLAlchemy — only warnings unless debug SQL is needed
        "sqlalchemy.engine": {
            "handlers": ["console"],
            "level": "INFO" if settings.debug else "WARNING",
            "propagate": False,
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}
logging.config.dictConfig(LOGGING_CONFIG)
logger = logging.getLogger(__name__)


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create upload directory on startup
    from pathlib import Path
    from app.services.redis_client import close_redis
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    logger.info(
        "🚀 ExamGen API starting | env=%s | llm_provider=%s | debug=%s",
        settings.app_env,
        settings.llm_provider,
        settings.debug,
    )
    yield
    await close_redis()
    logger.info("🛑 ExamGen API shutting down")


# ── App instance ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Exam Generator API",
    description=(
        "Generate customized exam papers from syllabus content using LLMs. "
        "Supports Groq (Llama 3.3 70B), Gemini (1.5 Flash), and local Ollama models."
    ),
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Next.js dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(generate.router, prefix="/api/v1")
app.include_router(templates.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/api/v1/health", tags=["system"], summary="Health check")
async def health() -> dict:
    return {
        "status": "ok",
        "env": settings.app_env,
        "llm_provider": settings.llm_provider,
        "llm_model": (
            settings.groq_model
            if settings.llm_provider == "groq"
            else settings.gemini_model
            if settings.llm_provider == "gemini"
            else settings.ollama_model
        ),
    }
