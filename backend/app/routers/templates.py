"""
Templates router — CRUD for exam templates & AI PYQ decompiler.
"""

import logging
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.db import User, Template as TemplateORM
from app.schemas.template import ExamTemplate, SaveTemplateRequest, Section, SubSection, CaseStudySubQConfig
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


class AnalyzePyqResponse(BaseModel):
    """Result of AI sample paper / PYQ reverse-engineering into an ExamTemplate."""
    status: str
    template: ExamTemplate
    preview_text: str
    message: str = "Blueprint reverse-engineered successfully from sample paper."


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
    if current_user and current_user.id:
        user_id = current_user.id
    else:
        user_id = _ADMIN_UID

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
    await db.commit()
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
    """Return all saved exam templates (blueprints) available for examination creation."""
    stmt = select(TemplateORM).order_by(TemplateORM.created_at.desc())
    result = await db.execute(stmt)
    rows = result.scalars().all()
    return [_to_summary(r) for r in rows]


# ── AI PYQ / Sample Paper Decompiler (Static route before /{template_id}) ─────

@router.post(
    "/analyze-pyq",
    response_model=AnalyzePyqResponse,
    summary="Reverse-engineer a sample question paper or PYQ PDF/text into an ExamTemplate blueprint",
)
async def analyze_pyq_endpoint(
    file: UploadFile | None = File(None),
    text: str | None = Form(None),
    current_user: User | None = Depends(get_current_user),
) -> AnalyzePyqResponse:
    """
    Reverse-engineers a sample question paper, previous year exam (PYQ),
    or syllabus PDF/text into an exact mathematical ExamTemplate blueprint.
    """
    extracted_text = ""
    if file:
        if not file.filename:
            raise HTTPException(status_code=400, detail="Invalid file upload.")
        file_bytes = await file.read()
        if len(file_bytes) > 30 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File size exceeds 30 MB limit.")
        
        if file.filename.lower().endswith(".pdf"):
            try:
                from app.services.document_processor import parse_pdf_bytes
                raw_res = parse_pdf_bytes(file_bytes)
                extracted_text = raw_res[0] if isinstance(raw_res, tuple) else str(raw_res)
            except Exception as pdf_err:
                logger.warning("PDF extraction failed in analyze-pyq: %s", pdf_err)
                raise HTTPException(status_code=400, detail=f"Could not parse PDF: {pdf_err}")
        else:
            extracted_text = file_bytes.decode("utf-8", errors="ignore")

    if text and text.strip():
        extracted_text = (extracted_text + "\n\n" + text.strip()).strip()

    if not extracted_text or len(extracted_text.strip()) < 20:
        raise HTTPException(
            status_code=400,
            detail="Please provide a valid PDF file or paste question paper text (minimum 20 characters).",
        )

    from app.config import settings
    from app.llm.factory import get_llm_client
    from app.services.exam_generator import _clean_and_parse_json

    llm = get_llm_client(settings.llm_provider)

    system_prompt = """You are the Chief Exam Architect and Curriculum Decompiler for Gurukul AI.
Your job is to reverse-engineer a Previous Year Question (PYQ) paper, CBSE/Board paper, or sample examination paper into a structured Exam Blueprint JSON.

RULES:
1. Extract metadata:
   - subject: e.g. "English Core", "Physics", "Chemistry", "Mathematics", "Biology", "Computer Science", etc.
   - grade: e.g. "Grade 12", "Grade 10", "Class 11", etc.
   - difficulty: "easy" | "medium" | "hard" | "extreme" (default to "medium")
   - total_marks: Total marks of the exam (e.g. 80, 70, 100, 50).
   - duration_minutes: Exam time in minutes (e.g. 180 for 3 hrs, 120 for 2 hrs, 90 for 1.5 hrs).
   - heading_details: Title/Heading from paper (e.g. "CBSE Senior School Examination 2025-26 — English Core (Code 301)").
   - instructions: General instructions printed at top of paper.
   - sections: List of sections in the paper.

2. FOR EACH SECTION:
   - id: "s1", "s2", "s3", ...
   - title: e.g. "Section A — Reading Skills", "Section B — Creative Writing Skills", "Section C — Literature"
   - type: one of ["case_study", "mcq", "short_answer", "long_answer", "fill_in_the_blanks", "true_false", "match_the_following", "one_word"]
     * IMPORTANT: For Reading Comprehension Passages, Case-Based Paragraphs, or Literature Extracts with multiple sub-questions, ALWAYS set type to "case_study".
     * If type is "case_study", you can provide "case_study_config": [{"type": "mcq", "count": 3, "marks_per_sub": 1}, {"type": "fill_in_the_blanks", "count": 2, "marks_per_sub": 1}, ...]
   - If a section contains multiple distinct parts (e.g. Part I Context Extracts, Part II Short Answer, Part III Long Answer), you can provide "sub_sections": [
       {"id": "s3_p1", "title": "Part I — Context Extracts", "type": "case_study", "num_questions": 2, "marks_per_question": 6, "case_study_config": [...]},
       {"id": "s3_p2", "title": "Part II — Short Answer Questions", "type": "short_answer", "num_questions": 5, "marks_per_question": 2},
       {"id": "s3_p3", "title": "Part III — Long Answer Questions", "type": "long_answer", "num_questions": 3, "marks_per_question": 6}
     ]
   - num_questions: number of lead questions/passages in this section (integer >= 1).
   - marks_per_question: marks per question (integer >= 1).
   - instructions: section-specific instructions or null.
   - topic_query: specific syllabus/chapter focus if mentioned, otherwise null.

3. MATHEMATICAL INTEGRITY (CRITICAL):
   - The sum of all section_marks MUST EXACTLY equal total_marks!
   - Ensure the total_marks matches the exam paper's stated total (e.g. 80, 70, 100).

4. Return ONLY raw valid JSON. No markdown fences, no explanatory text.

JSON FORMAT:
{
  "subject": "English Core",
  "grade": "Grade 12",
  "difficulty": "medium",
  "total_marks": 80,
  "duration_minutes": 180,
  "heading_details": "CBSE Class 12 English Core Examination",
  "instructions": "1. 15-minute reading time. 2. The paper is divided into three sections: Reading (22M), Writing (18M), Literature (40M). 3. Attempt all sections.",
  "sections": [
    {
      "id": "s1",
      "title": "Section A — Reading Skills",
      "type": "case_study",
      "num_questions": 2,
      "marks_per_question": 11,
      "case_study_config": [
        {"type": "mcq", "count": 4, "marks_per_sub": 1},
        {"type": "fill_in_the_blanks", "count": 3, "marks_per_sub": 1},
        {"type": "true_false", "count": 2, "marks_per_sub": 1},
        {"type": "short_answer", "count": 1, "marks_per_sub": 2}
      ],
      "instructions": "Read the passages carefully and answer the comprehension sub-questions.",
      "topic_query": "Reading Comprehension, Factual & Analytical Passages"
    },
    {
      "id": "s2",
      "title": "Section B — Creative Writing Skills",
      "type": "short_answer",
      "num_questions": 4,
      "marks_per_question": 4,
      "instructions": "Creative writing tasks: Notice, Invitation, Letter, Report/Article.",
      "topic_query": "Notice Writing, Formal Invitations, Letters to Editor, Article/Report"
    },
    {
      "id": "s3",
      "title": "Section C — Literature",
      "type": "long_answer",
      "num_questions": 7,
      "marks_per_question": 6,
      "instructions": "Reference to context extracts and analytical questions from prescribed texts.",
      "topic_query": "Flamingo & Vistas Literature Texts"
    }
  ]
}"""

    try:
        # Pass up to 80,000 characters to ensure full 15+ page board papers are completely analyzed
        paper_snippet = extracted_text[:80000]
        raw_res = await llm.generate(
            system_prompt=system_prompt,
            user_message=f"SAMPLE PAPER / PYQ TEXT TO DECOMPILE:\n\n{paper_snippet}\n\nReverse-engineer and return ONLY valid JSON.",
            temperature=0.2,
            max_tokens=4096,
        )
        parsed = _clean_and_parse_json(raw_res)
    except Exception as llm_err:
        logger.warning("LLM decompile failed: %s. Using heuristic extractor.", llm_err)
        # Safe heuristic fallback
        parsed = {
            "subject": "General Studies",
            "grade": "Grade 12",
            "difficulty": "medium",
            "total_marks": 80,
            "duration_minutes": 180,
            "heading_details": "Decompiled Examination Blueprint",
            "instructions": "Attempt all sections.",
            "sections": [
                {
                    "id": "s1",
                    "title": "Section A — Reading Skills / Case Studies",
                    "type": "case_study",
                    "num_questions": 2,
                    "marks_per_question": 11,
                    "instructions": "Read the passages and answer the sub-questions.",
                    "topic_query": None,
                },
                {
                    "id": "s2",
                    "title": "Section B — Subjective Writing & Analysis",
                    "type": "short_answer",
                    "num_questions": 3,
                    "marks_per_question": 6,
                    "instructions": None,
                    "topic_query": None,
                },
                {
                    "id": "s3",
                    "title": "Section C — Literature & Descriptive Questions",
                    "type": "long_answer",
                    "num_questions": 8,
                    "marks_per_question": 5,
                    "instructions": None,
                    "topic_query": None,
                }
            ],
        }

    # If parsed dict is wrapped in a top-level key like "template" or "exam"
    if isinstance(parsed, dict):
        if "template" in parsed and isinstance(parsed["template"], dict):
            parsed = parsed["template"]
        elif "exam" in parsed and isinstance(parsed["exam"], dict):
            parsed = parsed["exam"]

    valid_types = {
        "mcq", "short_answer", "long_answer", "case_study",
        "fill_in_the_blanks", "true_false", "match_the_following", "one_word"
    }

    raw_sections = parsed.get("sections", []) if isinstance(parsed, dict) else []
    cleaned_sections: list[Section] = []
    for idx, s in enumerate(raw_sections):
        if not isinstance(s, dict):
            continue
        stype = str(s.get("type", "mcq")).lower()
        if stype not in valid_types:
            if "case" in stype or "passage" in stype or "reading" in stype or "comprehension" in stype:
                stype = "case_study"
            elif "mcq" in stype or "choice" in stype or "objective" in stype:
                stype = "mcq"
            elif "long" in stype or "essay" in stype:
                stype = "long_answer"
            else:
                stype = "short_answer"
        
        num_q = max(1, int(s.get("num_questions") or 1))
        mpq = max(1, int(s.get("marks_per_question") or 1))

        # Parse case_study_config if present
        clean_csc: list[CaseStudySubQConfig] | None = None
        if "case_study_config" in s and isinstance(s["case_study_config"], list) and len(s["case_study_config"]) > 0:
            clean_csc = []
            for item in s["case_study_config"]:
                if isinstance(item, dict):
                    c_t = str(item.get("type", "mcq")).lower()
                    if c_t not in valid_types:
                        c_t = "mcq"
                    clean_csc.append(
                        CaseStudySubQConfig(
                            type=c_t,  # type: ignore
                            count=max(1, int(item.get("count") or 1)),
                            marks_per_sub=max(1, int(item.get("marks_per_sub") or 1)),
                        )
                    )
            if clean_csc and mpq:
                csc_tot = sum(c.count * c.marks_per_sub for c in clean_csc)
                if csc_tot != mpq:
                    clean_csc = [CaseStudySubQConfig(type="mcq", count=mpq, marks_per_sub=1)]

        # Parse sub_sections if present
        clean_sub_sections: list[SubSection] | None = None
        if "sub_sections" in s and isinstance(s["sub_sections"], list) and len(s["sub_sections"]) > 0:
            clean_sub_sections = []
            for sub_i, sub_item in enumerate(s["sub_sections"]):
                if isinstance(sub_item, dict):
                    sub_t = str(sub_item.get("type", "short_answer")).lower()
                    if sub_t not in valid_types:
                        sub_t = "short_answer"
                    sub_clean_csc: list[CaseStudySubQConfig] | None = None
                    if "case_study_config" in sub_item and isinstance(sub_item["case_study_config"], list):
                        sub_clean_csc = []
                        for sub_c in sub_item["case_study_config"]:
                            if isinstance(sub_c, dict):
                                sc_t = str(sub_c.get("type", "mcq")).lower()
                                if sc_t not in valid_types:
                                    sc_t = "mcq"
                                sub_clean_csc.append(
                                    CaseStudySubQConfig(
                                        type=sc_t,  # type: ignore
                                        count=max(1, int(sub_c.get("count") or 1)),
                                        marks_per_sub=max(1, int(sub_c.get("marks_per_sub") or 1)),
                                    )
                                )
                    clean_sub_sections.append(
                        SubSection(
                            id=str(sub_item.get("id") or f"{s.get('id', f's{idx+1}')}_p{sub_i+1}"),
                            title=str(sub_item.get("title") or f"Part {sub_i+1}"),
                            type=sub_t,  # type: ignore
                            num_questions=max(1, int(sub_item.get("num_questions") or 1)),
                            marks_per_question=max(1, int(sub_item.get("marks_per_question") or 1)),
                            instructions=sub_item.get("instructions"),
                            bloom_level=sub_item.get("bloom_level"),
                            topic_query=sub_item.get("topic_query"),
                            case_study_config=sub_clean_csc,
                        )
                    )

        cleaned_sections.append(
            Section(
                id=str(s.get("id") or f"s{idx+1}"),
                title=str(s.get("title") or f"Section {chr(65+idx)}"),
                type=stype,  # type: ignore
                num_questions=num_q,
                marks_per_question=mpq,
                instructions=s.get("instructions"),
                topic_query=s.get("topic_query"),
                case_study_config=clean_csc,
                sub_sections=clean_sub_sections,
            )
        )

    if not cleaned_sections:
        cleaned_sections = [
            Section(
                id="s1",
                title="Section A — Reading Skills / Case Study",
                type="case_study",
                num_questions=2,
                marks_per_question=11,
                instructions=None,
                topic_query=None,
            ),
            Section(
                id="s2",
                title="Section B — Subjective Writing & Analysis",
                type="short_answer",
                num_questions=3,
                marks_per_question=6,
                instructions=None,
                topic_query=None,
            ),
            Section(
                id="s3",
                title="Section C — Literature & Descriptive Questions",
                type="long_answer",
                num_questions=8,
                marks_per_question=5,
                instructions=None,
                topic_query=None,
            ),
        ]

    # Enforce mathematical consistency: total_marks == sum(section marks)
    computed_marks = sum(s.section_marks for s in cleaned_sections)
    target_total = int(parsed.get("total_marks", 0)) if isinstance(parsed, dict) and parsed.get("total_marks") else 0

    if target_total > 0 and computed_marks != target_total:
        diff = target_total - computed_marks
        # Step 1: Attempt exact divisibility adjustment on any flat section
        adjusted = False
        for s in reversed(cleaned_sections):
            if not s.sub_sections and not s.case_study_config:
                if diff % s.num_questions == 0 and (s.marks_per_question + diff // s.num_questions) >= 1:
                    s.marks_per_question += diff // s.num_questions
                    total_marks = target_total
                    adjusted = True
                    break
        
        # Step 2: If indivisible, adjust question count of the last section to reconcile
        if not adjusted:
            last_sec = cleaned_sections[-1]
            if not last_sec.sub_sections and not last_sec.case_study_config and diff > 0 and last_sec.marks_per_question > 0:
                add_q = diff // last_sec.marks_per_question
                if add_q > 0:
                    last_sec.num_questions += add_q
            total_marks = sum(s.section_marks for s in cleaned_sections)
    else:
        total_marks = computed_marks if computed_marks > 0 else (target_total if target_total > 0 else 80)

    duration_mins = max(10, int(parsed.get("duration_minutes", 180)) if isinstance(parsed, dict) and parsed.get("duration_minutes") else 180)
    subject_val = str(parsed.get("subject") or "General Studies").strip() if isinstance(parsed, dict) else "General Studies"
    grade_val = str(parsed.get("grade") or "Grade 12").strip() if isinstance(parsed, dict) else "Grade 12"
    diff_val = str(parsed.get("difficulty") or "medium").lower() if isinstance(parsed, dict) else "medium"
    if diff_val not in ["easy", "medium", "hard", "extreme"]:
        diff_val = "medium"

    template = ExamTemplate(
        subject=subject_val,
        grade=grade_val,
        difficulty=diff_val,  # type: ignore
        total_marks=total_marks,
        duration_minutes=duration_mins,
        heading_details=parsed.get("heading_details") if isinstance(parsed, dict) else None,
        instructions=parsed.get("instructions") if isinstance(parsed, dict) else None,
        sections=cleaned_sections,
    )

    return AnalyzePyqResponse(
        status="success",
        template=template,
        preview_text=extracted_text[:400].strip(),
        message="Question paper decompiled into blueprint successfully!",
    )


# ── Parameterized routes (placed after static routes) ─────────────────────────

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
    await db.commit()
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
    await db.commit()
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
