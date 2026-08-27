import logging
import uuid
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.llm.base import LLMProviderError
from app.models.db import GeneratedExam as GeneratedExamORM
from app.models.db import User, Document as DocumentORM
from app.schemas.exam import ExamGenerationResponse
from app.schemas.template import ExamTemplate
from app.services.auth import get_current_user
from app.services.exam_generator import generate_exam

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/generate", tags=["generation"])

_TEACHER_UID = uuid.UUID("00000000-0000-0000-0000-000000000001")
_ADMIN_UID = uuid.UUID("00000000-0000-0000-0000-000000000002")

class GenerateExamRequest(BaseModel):
    template: ExamTemplate = Field(...)
    document_id: str | None = Field(None)
    web_query: str | None = Field(None)
    syllabus_text: str | None = Field(None)
    source_type: str = Field("hardcoded")
    custom_topic: str | None = Field(None)

async def _resolve_syllabus(body: GenerateExamRequest, db: AsyncSession) -> tuple[str, str]:
    default_fallback = f"Standard comprehensive academic curriculum and core examination topics for {body.template.subject} {body.template.grade} ({body.template.difficulty} level). Focus areas: {body.custom_topic or 'Core curriculum, theoretical principles, problem-solving, and applications'}."

    if body.document_id:
        try:
            doc_uuid = uuid.UUID(body.document_id)
            doc = await db.get(DocumentORM, doc_uuid)
            if doc and doc.status == "ready":
                from app.services.rag import retrieve_context
                query_base = body.custom_topic if body.custom_topic else f"{body.template.subject} {body.template.grade} {body.template.difficulty} exam topics chapters"
                context = await retrieve_context(db=db, document_id=body.document_id, query=query_base, top_k=14)
                if context and "No web results found" not in context and len(context.strip()) > 50:
                    return context, "document"
        except Exception as err:
            logger.warning("Error retrieving document context: %s", err)

    if body.web_query:
        try:
            from app.services.searxng import fetch_syllabus_from_web
            web_text = await fetch_syllabus_from_web(body.template.subject, body.template.grade, body.web_query)
            if web_text and "No web results found" not in web_text and len(web_text.strip()) > 50:
                return web_text, "web_fetch"
        except Exception as err:
            logger.warning("Web fetch failed: %s", err)

    if body.syllabus_text and len(body.syllabus_text.strip()) > 10 and "No web results found" not in body.syllabus_text:
        return body.syllabus_text, body.source_type or "hardcoded"

    return default_fallback, "curriculum_synthesis"

@router.post("/exam")
async def generate_exam_endpoint(
    body: GenerateExamRequest,
    current_user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    syllabus_text, source_type = await _resolve_syllabus(body, db)
    user_role = current_user.role if current_user else "teacher"
    author_id = current_user.id if current_user else (_ADMIN_UID if user_role == "admin" else _TEACHER_UID)

    async def event_stream():
        try:
            async for update in generate_exam(
                template=body.template,
                syllabus_text=syllabus_text,
                source_type=source_type,
                custom_topic=body.custom_topic,
            ):
                if isinstance(update, dict):
                    yield json.dumps(update) + "\n"
                else:
                    exam, retries_used, llm = update
                    
                    exam_id = uuid.uuid4()
                    exam.exam_id = str(exam_id)
                    db_record = GeneratedExamORM(
                        id=exam_id,
                        user_id=author_id,
                        template_id=None,
                        document_id=uuid.UUID(body.document_id) if body.document_id else None,
                        source_type=source_type,
                        exam_json=exam.model_dump(),
                        llm_provider=llm.provider_name,
                        llm_model=llm.model_name,
                        created_by_role=user_role,
                        is_published=False,
                        retries_used=retries_used,
                    )
                    db.add(db_record)
                    await db.commit()
                    
                    res = ExamGenerationResponse(exam=exam)
                    yield json.dumps(res.model_dump()) + "\n"
        except LLMProviderError as exc:
            yield json.dumps({"error": f"LLM error: {str(exc)}"}) + "\n"
        except Exception as exc:
            yield json.dumps({"error": str(exc)}) + "\n"

    return StreamingResponse(event_stream(), media_type="application/x-ndjson")


@router.post("/exam/{exam_id}/publish")
async def publish_exam_endpoint(
    exam_id: str,
    publish: bool = True,
    current_user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Publish an exam / quiz to make it live for students in the Student Arena."""
    try:
        e_uuid = uuid.UUID(exam_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid exam ID")

    result = await db.execute(select(GeneratedExamORM).where(GeneratedExamORM.id == e_uuid))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Exam not found")

    record.is_published = publish
    record.created_by_role = "admin"
    await db.commit()

    return {
        "status": "ok",
        "exam_id": str(record.id),
        "is_published": record.is_published,
        "message": "Quiz published to Student Arena" if publish else "Quiz unpublished",
    }
