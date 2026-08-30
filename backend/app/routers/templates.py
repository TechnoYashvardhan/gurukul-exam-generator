"""
Templates router — CRUD for exam templates.

Phase 2: save/retrieve/delete templates for the visual Template Builder UI.
user_id is a placeholder (00000000-0000-0000-0000-000000000001) until Phase 4 auth.
"""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.db import User, Template as TemplateORM
from app.schemas.template import ExamTemplate, SaveTemplateRequest
from app.services.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/templates", tags=["templates"])

_TEACHER_UID = uuid.UUID("00000000-0000-0000-0000-000000000001")
_ADMIN_UID = uuid.UUID("00000000-0000-0000-0000-000000000002")


# ── Response schemas ──────────────────────────────────────────────────────────

class TemplateSummary(BaseModel):
    """Lightweight template listing item."""
    id: str
    name: str
    subject: str | None
    grade: str | None
    total_marks: int
    num_sections: int
    created_at: str


class TemplateDetail(TemplateSummary):
    """Full template detail including the config blob."""
    config: dict


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=TemplateDetail,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
@router.post(
    "/",
    response_model=TemplateDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Save a new exam template",
)
async def create_template(
    body: SaveTemplateRequest,
    role: str | None = None,
    current_user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TemplateDetail:
    """Persist an exam template for future reuse."""
    if role == "admin":
        user_id = _ADMIN_UID
    elif role == "teacher":
        user_id = _TEACHER_UID
    elif current_user:
        user_id = current_user.id
    else:
        user_id = _TEACHER_UID

    template_id = uuid.uuid4()
    record = TemplateORM(
        id=template_id,
        user_id=user_id,
        name=body.name,
        subject=body.template.subject,
        grade=body.template.grade,
        config=body.template.model_dump(),
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)

    logger.info(
        "Template saved | id=%s | name=%s | subject=%s | grade=%s | user=%s",
        template_id, body.name, body.template.subject, body.template.grade, user_id,
    )

    return _to_detail(record)


@router.get(
    "",
    response_model=list[TemplateSummary],
    include_in_schema=False,
)
@router.get(
    "/",
    response_model=list[TemplateSummary],
    summary="List all saved templates",
)
async def list_templates(
    role: str | None = None,
    current_user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[TemplateSummary]:
    """Return all templates belonging to the requested role or current user."""
    stmt = select(TemplateORM).order_by(TemplateORM.created_at.desc())
    if role == "admin":
        stmt = stmt.where(TemplateORM.user_id == _ADMIN_UID)
    elif role == "teacher":
        stmt = stmt.where(TemplateORM.user_id == _TEACHER_UID)
    elif current_user:
        stmt = stmt.where(TemplateORM.user_id.in_([current_user.id, _TEACHER_UID, _ADMIN_UID]))

    result = await db.execute(stmt)
    rows = result.scalars().all()
    return [_to_summary(r) for r in rows]


@router.get(
    "/{template_id}",
    response_model=TemplateDetail,
    summary="Get a single template by ID",
)
async def get_template(
    template_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> TemplateDetail:
    record = await _get_or_404(template_id, db)
    return _to_detail(record)


@router.put(
    "/{template_id}",
    response_model=TemplateDetail,
    summary="Update an existing template",
)
async def update_template(
    template_id: uuid.UUID,
    body: SaveTemplateRequest,
    db: AsyncSession = Depends(get_db),
) -> TemplateDetail:
    record = await _get_or_404(template_id, db)
    record.name = body.name
    record.subject = body.template.subject
    record.grade = body.template.grade
    record.config = body.template.model_dump()
    await db.flush()
    await db.refresh(record)

    logger.info("Template updated | id=%s | name=%s", template_id, body.name)
    return _to_detail(record)


@router.delete(
    "/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a template",
)
async def delete_template(
    template_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> None:
    await _get_or_404(template_id, db)
    await db.execute(
        delete(TemplateORM).where(TemplateORM.id == template_id)
    )
    logger.info("Template deleted | id=%s", template_id)


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_or_404(template_id: uuid.UUID, db: AsyncSession) -> TemplateORM:
    result = await db.execute(
        select(TemplateORM).where(TemplateORM.id == template_id)
    )
    record = result.scalar_one_or_none()
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "template_not_found", "id": str(template_id)},
        )
    return record


def _to_summary(r: TemplateORM) -> TemplateSummary:
    cfg = r.config or {}
    return TemplateSummary(
        id=str(r.id),
        name=r.name,
        subject=r.subject,
        grade=r.grade,
        total_marks=cfg.get("total_marks", 0),
        num_sections=len(cfg.get("sections", [])),
        created_at=r.created_at.isoformat(),
    )


def _to_detail(r: TemplateORM) -> TemplateDetail:
    cfg = r.config or {}
    return TemplateDetail(
        id=str(r.id),
        name=r.name,
        subject=r.subject,
        grade=r.grade,
        total_marks=cfg.get("total_marks", 0),
        num_sections=len(cfg.get("sections", [])),
        created_at=r.created_at.isoformat(),
        config=cfg,
    )
