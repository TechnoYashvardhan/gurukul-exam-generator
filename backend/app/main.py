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
from app.routers import generate, templates, documents, auth, student, admin

# ── Logging setup ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

_app_logger = logging.getLogger("app")
_app_logger.setLevel(logging.DEBUG if settings.debug else logging.INFO)
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
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
        from app.database import fallback_to_local_sqlite
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        except Exception as e:
            logger.warning(f"Database startup init warning: {e}. Falling back to local SQLite.")
            fallback_to_local_sqlite()
            from app.database import engine as fb_engine
            async with fb_engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        else:
            if not settings.database_url.startswith("sqlite"):
                logger.info("[DATABASE] Successfully connected to PostgreSQL / Supabase cloud database!")

        from app.database import engine as cur_engine
        is_postgres = not settings.database_url.startswith("sqlite")
        from sqlalchemy import text
        if is_postgres:
            migrations = [
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS scholar_id TEXT",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS class_id TEXT",
                "ALTER TABLE generated_exams ADD COLUMN IF NOT EXISTS target_class_id TEXT",
                "ALTER TABLE generated_exams ADD COLUMN IF NOT EXISTS schedule_start_at TIMESTAMP WITH TIME ZONE",
                "ALTER TABLE generated_exams ADD COLUMN IF NOT EXISTS schedule_end_at TIMESTAMP WITH TIME ZONE",
            ]
            async with cur_engine.begin() as conn:
                for sql in migrations:
                    try:
                        await conn.execute(text(sql))
                    except Exception:
                        pass
        else:
            # SQLite: inspect table columns first to avoid OperationalError on every boot
            async with cur_engine.begin() as conn:
                for table, col, col_def in [
                    ("users", "scholar_id", "TEXT"),
                    ("users", "class_id", "TEXT"),
                    ("generated_exams", "target_class_id", "TEXT"),
                    ("generated_exams", "schedule_start_at", "DATETIME"),
                    ("generated_exams", "schedule_end_at", "DATETIME"),
                ]:
                    try:
                        info = await conn.execute(text(f"PRAGMA table_info({table})"))
                        existing_cols = {row[1] for row in info.fetchall()}
                        if col not in existing_cols:
                            await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_def}"))
                    except Exception:
                        pass
            
        # Seed default users & classes
        _default_uid = uuid.UUID("00000000-0000-0000-0000-000000000001")
        _admin_uid = uuid.UUID("00000000-0000-0000-0000-000000000002")
        _student_uid = uuid.UUID("00000000-0000-0000-0000-000000000003")
        _class_1_id = uuid.UUID("10000000-0000-0000-0000-000000000001")
        _class_2_id = uuid.UUID("10000000-0000-0000-0000-000000000002")
        _class_3_id = uuid.UUID("10000000-0000-0000-0000-000000000003")

        from app.services.auth import get_password_hash
        from app.models.db import ClassGroup
        from app.database import AsyncSessionLocal as cur_session_maker

        async with cur_session_maker() as session:
            # Seed classes
            c1 = await session.get(ClassGroup, _class_1_id)
            if not c1:
                session.add(ClassGroup(
                    id=_class_1_id,
                    name="BCA - 1st Year",
                    course="BCA",
                    section="Batch 2026-27",
                ))
            c2 = await session.get(ClassGroup, _class_2_id)
            if not c2:
                session.add(ClassGroup(
                    id=_class_2_id,
                    name="BCA - 2nd Year",
                    course="BCA",
                    section="Batch 2025-26",
                ))
            c3 = await session.get(ClassGroup, _class_3_id)
            if not c3:
                session.add(ClassGroup(
                    id=_class_3_id,
                    name="MSc Computer Science",
                    course="MSc CS",
                    section="Semester 1",
                ))

            # Seed Official Single Admin (Admin_DSVV01)
            admin = await session.get(User, _admin_uid)
            admin_pw_hash = get_password_hash("OmBhBS@123")
            if not admin:
                session.add(User(
                    id=_admin_uid,
                    email="Admin_DSVV01@dsvv.ac.in",
                    hashed_pw=admin_pw_hash,
                    full_name="Chief Admin DSVV",
                    role="admin"
                ))
            else:
                admin.hashed_pw = admin_pw_hash
                admin.email = "Admin_DSVV01@dsvv.ac.in"
                admin.full_name = "Chief Admin DSVV"

            # Clean up legacy dummy accounts if present
            old_teacher = await session.get(User, _default_uid)
            if old_teacher:
                await session.delete(old_teacher)

            old_student = await session.get(User, _student_uid)
            if old_student:
                await session.delete(old_student)

            # Seed Default Templates (Vidya Blueprints) assigned to Admin
            from app.models.db import Template
            _tpl_1_id = uuid.UUID("20000000-0000-0000-0000-000000000001")
            _tpl_2_id = uuid.UUID("20000000-0000-0000-0000-000000000002")
            _tpl_3_id = uuid.UUID("20000000-0000-0000-0000-000000000003")

            t1 = await session.get(Template, _tpl_1_id)
            if not t1:
                session.add(Template(
                    id=_tpl_1_id,
                    user_id=_admin_uid,
                    name="BCA - Computer Hardware & Components",
                    subject="Computer Hardware & Components",
                    grade="BCA",
                    config={
                        "subject": "Computer Hardware & Components",
                        "grade": "BCA",
                        "difficulty": "medium",
                        "total_marks": 40,
                        "duration_minutes": 180,
                        "heading_details": "Dev Sanskriti Vishwavidyalaya<br>Practice Quiz<br>Course: BCA",
                        "instructions": "All questions are compulsory.\nRead all the questions carefully.",
                        "sections": [
                            {"id": "sec-a", "title": "Multiple Choice Questions", "type": "mcq", "num_questions": 5, "marks_per_question": 2},
                            {"id": "sec-b", "title": "Short Answer Questions", "type": "short_answer", "num_questions": 4, "marks_per_question": 5},
                            {"id": "sec-c", "title": "Match The Following", "type": "match_the_following", "num_questions": 2, "marks_per_question": 5},
                        ]
                    }
                ))
            else:
                t1.user_id = _admin_uid

            t2 = await session.get(Template, _tpl_2_id)
            if not t2:
                session.add(Template(
                    id=_tpl_2_id,
                    user_id=_admin_uid,
                    name="Physics - Class 11 Mechanics & Optics",
                    subject="Physics",
                    grade="Class 11",
                    config={
                        "subject": "Physics",
                        "grade": "Class 11",
                        "difficulty": "medium",
                        "total_marks": 50,
                        "duration_minutes": 180,
                        "heading_details": "Gurukul Examination Board<br>Annual Physics Assessment",
                        "instructions": "Answer all questions. Show complete steps for numerical problems.",
                        "sections": [
                            {"id": "sec-1", "title": "Section A — Conceptual MCQs", "type": "mcq", "num_questions": 10, "marks_per_question": 1},
                            {"id": "sec-2", "title": "Section B — Short Answer Problems", "type": "short_answer", "num_questions": 5, "marks_per_question": 4},
                            {"id": "sec-3", "title": "Section C — Comparative Analysis", "type": "match_the_following", "num_questions": 2, "marks_per_question": 5},
                            {"id": "sec-4", "title": "Section D — Long Derivations", "type": "long_answer", "num_questions": 2, "marks_per_question": 5},
                        ]
                    }
                ))
            else:
                t2.user_id = _admin_uid

            t3 = await session.get(Template, _tpl_3_id)
            if not t3:
                session.add(Template(
                    id=_tpl_3_id,
                    user_id=_admin_uid,
                    name="Mathematics - Class 10 Board Blueprint",
                    subject="Mathematics",
                    grade="Class 10",
                    config={
                        "subject": "Mathematics",
                        "grade": "Class 10",
                        "difficulty": "medium",
                        "total_marks": 40,
                        "duration_minutes": 120,
                        "heading_details": "Central Board Examination<br>Mathematics Standard",
                        "instructions": "All questions are compulsory. Use of calculators is not permitted.",
                        "sections": [
                            {"id": "sec-m1", "title": "Section A — Multiple Choice", "type": "mcq", "num_questions": 10, "marks_per_question": 1},
                            {"id": "sec-m2", "title": "Section B — Short Answer", "type": "short_answer", "num_questions": 4, "marks_per_question": 3},
                            {"id": "sec-m3", "title": "Section C — Long Answer", "type": "long_answer", "num_questions": 3, "marks_per_question": 6},
                        ]
                    }
                ))
            else:
                t3.user_id = _admin_uid

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


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(student.router, prefix="/api/v1")
app.include_router(generate.router, prefix="/api/v1")
app.include_router(templates.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/", tags=["system"], summary="Root status check")
async def root() -> dict:
    return {
        "status": "ok",
        "app": "Gurukul AI Exam Generator API",
        "version": "0.1.0",
        "docs": "/docs",
    }


@app.get("/api/v1/health", tags=["system"], summary="Health check")
async def health() -> dict:
    from app.database import active_db_type
    return {
        "status": "ok",
        "env": settings.app_env,
        "database": active_db_type,
        "llm_provider": settings.llm_provider,
        "llm_model": (
            settings.openrouter_model
            if settings.llm_provider == "openrouter"
            else settings.groq_model
            if settings.llm_provider == "groq"
            else settings.gemini_model
            if settings.llm_provider == "gemini"
            else settings.ollama_model
        ),
    }
