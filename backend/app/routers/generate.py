import logging
import uuid
import json
from datetime import datetime
from typing import Optional

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


class PublishExamPayload(BaseModel):
    publish: bool = True
    target_class_id: Optional[str] = None
    schedule_start_at: Optional[str] = None
    schedule_end_at: Optional[str] = None


@router.post("/exam/{exam_id}/publish")
async def publish_exam_endpoint(
    exam_id: str,
    publish: bool = True,
    target_class_id: Optional[str] = None,
    schedule_start_at: Optional[str] = None,
    schedule_end_at: Optional[str] = None,
    payload: Optional[PublishExamPayload] = None,
    current_user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Publish an exam / quiz to make it live for students in the Student Arena with cohort targeting and scheduling."""
    try:
        e_uuid = uuid.UUID(exam_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid exam ID")

    result = await db.execute(select(GeneratedExamORM).where(GeneratedExamORM.id == e_uuid))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Exam not found")

    eff_publish = payload.publish if payload is not None else publish
    eff_target_class = payload.target_class_id if payload is not None else target_class_id
    eff_start = payload.schedule_start_at if payload is not None else schedule_start_at
    eff_end = payload.schedule_end_at if payload is not None else schedule_end_at

    record.is_published = eff_publish
    record.created_by_role = "admin"
    if eff_target_class and eff_target_class != "all":
        try:
            record.target_class_id = uuid.UUID(eff_target_class)
        except ValueError:
            pass
    elif eff_target_class == "all":
        record.target_class_id = None

    if eff_start:
        try:
            record.schedule_start_at = datetime.fromisoformat(eff_start.replace("Z", "+00:00"))
        except Exception:
            pass
    else:
        record.schedule_start_at = None

    if eff_end:
        try:
            record.schedule_end_at = datetime.fromisoformat(eff_end.replace("Z", "+00:00"))
        except Exception:
            pass
    else:
        record.schedule_end_at = None

    await db.commit()

    return {
        "status": "ok",
        "exam_id": str(record.id),
        "is_published": record.is_published,
        "target_class_id": str(record.target_class_id) if record.target_class_id else None,
        "schedule_start_at": record.schedule_start_at.isoformat() if record.schedule_start_at else None,
        "schedule_end_at": record.schedule_end_at.isoformat() if record.schedule_end_at else None,
        "message": "Quiz published to Student Arena" if eff_publish else "Quiz unpublished",
    }


class ImportExamPayload(BaseModel):
    exam: dict


@router.post("/import-json")
async def import_exam_endpoint(
    payload: ImportExamPayload,
    current_user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Import a custom question paper from JSON, validate its structure,
    and persist it to the database for publishing or history tracking.
    """
    user_role = current_user.role if current_user else "teacher"
    author_id = current_user.id if current_user else (_ADMIN_UID if user_role == "admin" else _TEACHER_UID)

    exam_dict = payload.exam
    raw_id = exam_dict.get("exam_id")
    try:
        exam_id = uuid.UUID(raw_id) if raw_id else uuid.uuid4()
    except (ValueError, TypeError):
        exam_id = uuid.uuid4()

    exam_dict["exam_id"] = str(exam_id)

    # Check if record already exists
    existing = await db.get(GeneratedExamORM, exam_id)
    if existing:
        existing.exam_json = exam_dict
        existing.created_by_role = user_role
        await db.commit()
        await db.refresh(existing)
        return {"status": "ok", "exam": exam_dict, "exam_id": str(exam_id)}

    db_record = GeneratedExamORM(
        id=exam_id,
        user_id=author_id,
        template_id=None,
        document_id=None,
        source_type="imported_json",
        exam_json=exam_dict,
        llm_provider="imported_json",
        llm_model="custom",
        created_by_role=user_role,
        is_published=bool(exam_dict.get("is_published", False)),
        retries_used=0,
    )
    db.add(db_record)
    await db.commit()
    await db.refresh(db_record)

    return {"status": "ok", "exam": exam_dict, "exam_id": str(exam_id)}

