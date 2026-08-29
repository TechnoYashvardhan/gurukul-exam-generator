"""
FastAPI application entry point.
"""

import io
import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import generate, templates, documents, auth, student

# ── Logging setup ─────────────────────────────────────────────────────────────
class SafeStreamHandler(logging.StreamHandler):
    """StreamHandler that gracefully falls back to ASCII replacement on Windows charmap errors."""
    def emit(self, record):
        try:
            msg = self.format(record)
            stream = self.stream
            try:
                stream.write(msg + self.terminator)
            except (UnicodeEncodeError, UnicodeError):
                safe_msg = msg.encode("ascii", errors="replace").decode("ascii")
                stream.write(safe_msg + self.terminator)
            self.flush()
        except Exception:
            self.handleError(record)

_fmt = logging.Formatter(
    fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
_handler = SafeStreamHandler(sys.stdout)
_handler.setFormatter(_fmt)

logging.root.handlers = []
logging.root.addHandler(_handler)
logging.root.setLevel(logging.INFO)

# App logger — verbose in dev
_app_logger = logging.getLogger("app")
_app_logger.setLevel(logging.DEBUG if settings.debug else logging.INFO)
_app_logger.propagate = True

# SQLAlchemy
logging.getLogger("sqlalchemy.engine").setLevel(
    logging.INFO if settings.debug else logging.WARNING
)

logger = logging.getLogger(__name__)


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create upload directory on startup
    from pathlib import Path
    import uuid
    from app.services.redis_client import close_redis
    from app.database import engine, Base, AsyncSessionLocal
    from app.models.db import User
    
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    
    # Auto-create all tables if they do not exist
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            
        # Seed default users
        _default_uid = uuid.UUID("00000000-0000-0000-0000-000000000001")
        _admin_uid = uuid.UUID("00000000-0000-0000-0000-000000000002")
        _student_uid = uuid.UUID("00000000-0000-0000-0000-000000000003")
        async with AsyncSessionLocal() as session:
            user = await session.get(User, _default_uid)
            if not user:
                session.add(User(
                    id=_default_uid,
                    email="teacher@gurukul.local",
                    hashed_pw="placeholder",
                    full_name="Gurukul Teacher",
                    role="teacher"
                ))
            admin = await session.get(User, _admin_uid)
            if not admin:
                session.add(User(
                    id=_admin_uid,
                    email="admin@gurukul.local",
                    hashed_pw="placeholder",
                    full_name="Gurukul Admin",
                    role="admin"
                ))
            student_user = await session.get(User, _student_uid)
            if not student_user:
                session.add(User(
                    id=_student_uid,
                    email="student@gurukul.local",
                    hashed_pw="placeholder",
                    full_name="Arjuna Student",
                    role="student"
                ))
            await session.commit()
    except Exception as e:
        logger.warning("Database startup init warning: %s", e)

    logger.info(
        "[STARTUP] ExamGen API starting | env=%s | llm_provider=%s | debug=%s",
        settings.app_env,
        settings.llm_provider,
        settings.debug,
    )
    yield
    await close_redis()
    logger.info("[SHUTDOWN] ExamGen API shutting down")


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
    allow_origin_regex=r"^https?:\/\/.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.middleware("http")
async def universal_cors_middleware(request, call_next):
    origin = request.headers.get("origin") or "*"
    if request.method == "OPTIONS":
        from fastapi.responses import Response
        res = Response(status_code=204)
        res.headers["Access-Control-Allow-Origin"] = origin
        res.headers["Access-Control-Allow-Credentials"] = "true"
        res.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        res.headers["Access-Control-Allow-Headers"] = "*"
        return res

    try:
        response = await call_next(request)
    except Exception as exc:
        from fastapi.responses import JSONResponse
        logger.exception("Unhandled error processing request: %s", exc)
        response = JSONResponse(
            status_code=500,
            content={"detail": "Internal server error occurred."},
        )

    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/v1")
app.include_router(student.router, prefix="/api/v1")
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
