"""
Generate router — POST /api/v1/generate/exam

Phase 1: Inline syllabus_text (hardcoded)
Phase 3: Adds document_id (RAG from pgvector) and web_query (SearXNG auto-fetch)

Source priority:
  1. document_id → retrieve relevant chunks from pgvector (RAG)
  2. web_query   → fetch + scrape via SearXNG, use as context
  3. syllabus_text → inline text (Phase 1 / testing fallback)
"""

import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.llm.base import LLMProviderError
from app.models.db import GeneratedExam as GeneratedExamORM
from app.models.db import Document as DocumentORM
from app.schemas.exam import ExamGenerationResponse
from app.schemas.template import ExamTemplate
from app.services.exam_generator import generate_exam

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/generate", tags=["generation"])

_PLACEHOLDER_USER = uuid.UUID("00000000-0000-0000-0000-000000000001")


# ── Request body ──────────────────────────────────────────────────────────────

class GenerateExamRequest(BaseModel):
    template: ExamTemplate = Field(..., description="Validated exam template")

    # ── Source options (use exactly one) ──────────────────────────────────────
    document_id: str | None = Field(
        None,
        description="UUID of an ingested document — use RAG retrieval from pgvector.",
    )
    web_query: str | None = Field(
        None,
        description=(
            "If set, fetch syllabus from web via SearXNG using this subject+grade. "
            "Falls back to template.subject + template.grade if not provided."
        ),
    )
    syllabus_text: str | None = Field(
        None,
        min_length=20,
        description=(
            "Raw syllabus text (Phase 1 / manual override). "
            "Used only when document_id and web_query are both absent."
        ),
    )
    source_type: str = Field(
        "hardcoded",
        description="document | web_fetch | hardcoded — audit trail only",
    )
    custom_topic: str | None = Field(
        None,
        description="Custom topic or prompt instruction to focus the exam generation.",
    )


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post(
    "/exam",
    response_model=ExamGenerationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate an exam paper (RAG, web-fetch, or inline text)",
)
async def generate_exam_endpoint(
    body: GenerateExamRequest,
    db: AsyncSession = Depends(get_db),
) -> ExamGenerationResponse:
    logger.info(
        "Exam generation request | subject=%s | grade=%s | marks=%d | source=%s",
        body.template.subject,
        body.template.grade,
        body.template.total_marks,
        body.source_type,
    )

    # ── Resolve syllabus text ─────────────────────────────────────────────────
    syllabus_text, source_type = await _resolve_syllabus(body, db)

    # ── Run generation pipeline ───────────────────────────────────────────────
    try:
        exam, retries_used, llm = await generate_exam(
            template=body.template,
            syllabus_text=syllabus_text,
            source_type=source_type,
            custom_topic=body.custom_topic,
        )
    except LLMProviderError as exc:
        logger.error("LLM provider error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "llm_provider_error",
                "provider": exc.provider,
                "message": str(exc),
            },
        )
    except ValueError as exc:
        logger.error("Exam generation failed after retries: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "generation_validation_failed",
                "message": str(exc),
            },
        )

    # ── Persist ───────────────────────────────────────────────────────────────
    exam_id = uuid.uuid4()
    db_record = GeneratedExamORM(
        id=exam_id,
        user_id=_PLACEHOLDER_USER,
        template_id=None,
        document_id=uuid.UUID(body.document_id) if body.document_id else None,
        source_type=source_type,
        exam_json=exam.model_dump(),
        llm_provider=llm.provider_name,
        llm_model=llm.model_name,
        retries_used=retries_used,
    )
    db.add(db_record)

    logger.info(
        "✓ Exam persisted | id=%s | retries=%d | provider=%s | source=%s",
        exam_id, retries_used, llm.provider_name, source_type,
    )

    return ExamGenerationResponse(
        exam_id=str(exam_id),
        subject=exam.subject,
        grade=exam.grade,
        total_marks=exam.total_marks,
        duration_minutes=exam.duration_minutes,
        heading_details=body.template.heading_details,
        instructions=body.template.instructions,
        questions=exam.questions,
        retries_used=retries_used,
        llm_provider=llm.provider_name,
        llm_model=llm.model_name,
    )


# ── Syllabus resolver ─────────────────────────────────────────────────────────

async def _resolve_syllabus(
    body: GenerateExamRequest,
    db: AsyncSession,
) -> tuple[str, str]:
    """
    Determine the syllabus text and source_type to use.

    Priority: document_id > web_query > syllabus_text
    """
    # ── Priority 1: RAG from pgvector ─────────────────────────────────────────
    if body.document_id:
        # Validate document exists and is ready
        result = await db.execute(
            select(DocumentORM).where(
                DocumentORM.id == uuid.UUID(body.document_id),
                DocumentORM.user_id == _PLACEHOLDER_USER,
            )
        )
        doc = result.scalar_one_or_none()
        if doc is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "document_not_found", "id": body.document_id},
            )
        if doc.status != "ready":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error": "document_not_ready",
                    "status": doc.status,
                    "message": (
                        f"Document is still '{doc.status}'. "
                        "Wait for ingestion to complete before generating."
                    ),
                },
            )

        from app.services.rag import retrieve_context
        query_base = body.custom_topic if body.custom_topic else f"{body.template.subject} {body.template.grade} {body.template.difficulty} exam topics chapters"
        query = query_base
        context = await retrieve_context(
            db=db,
            document_id=body.document_id,
            query=query,
            top_k=14,
        )
        if not context:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error": "no_chunks_found",
                    "message": "Document has no chunks. Ingestion may have failed.",
                },
            )
        logger.info("Using RAG source | doc_id=%s | context_len=%d", body.document_id, len(context))
        return context, "document"

    # ── Priority 2: Web fetch via SearXNG ─────────────────────────────────────
    if body.web_query or (not body.syllabus_text):
        from app.services.searxng import fetch_syllabus_from_web
        subject = body.template.subject
        grade = body.template.grade
        extra = body.web_query or ""
        logger.info("Using web-fetch source | subject=%s | grade=%s", subject, grade)
        web_text = await fetch_syllabus_from_web(subject, grade, extra)
        return web_text, "web_fetch"

    # ── Priority 3: Inline syllabus_text (Phase 1 / testing) ─────────────────
    logger.info("Using hardcoded syllabus_text | len=%d", len(body.syllabus_text))
    return body.syllabus_text, body.source_type or "hardcoded"
