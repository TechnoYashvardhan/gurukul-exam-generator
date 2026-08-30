"""
Documents router — upload, list, detail, delete.

POST /api/v1/documents/upload
  - Accepts multipart PDF upload
  - Deduplicates via SHA-256 hash (returns existing doc if already processed)
  - Saves file to UPLOAD_DIR
  - Stores Document row (status=processing)
  - Runs ingestion pipeline in a background thread
  - Updates status to ready/error when done

GET  /api/v1/documents/
  - List all documents for current user (placeholder user for now)

GET  /api/v1/documents/{document_id}
  - Full document detail + chunk count

DELETE /api/v1/documents/{document_id}
  - Deletes document, all its chunks (CASCADE), and the uploaded file

POST /api/v1/documents/web-fetch
  - Trigger SearXNG + scrape for a given subject + grade
  - Stores result as a Document with source=web_fetch
"""

import asyncio
import logging
import uuid
from pathlib import Path

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from pydantic import BaseModel, Field
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.db import Document as DocumentORM, DocumentChunk
from app.services.document_processor import compute_sha256, process_and_store_document
from app.services.redis_client import redis_delete
from app.services.searxng import fetch_syllabus_from_web

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])

_PLACEHOLDER_USER = uuid.UUID("00000000-0000-0000-0000-000000000001")
MAX_UPLOAD_MB = 50


# ── Response schemas ──────────────────────────────────────────────────────────

class DocumentSummary(BaseModel):
    id: str
    filename: str
    subject: str | None
    grade: str | None
    status: str       # pending | processing | ready | error
    source: str       # upload | web_fetch
    page_count: int | None
    chunk_count: int
    created_at: str


class WebFetchRequest(BaseModel):
    subject: str = Field(..., min_length=1, max_length=200)
    grade: str = Field(..., min_length=1, max_length=100)
    extra_keywords: str = Field("", max_length=500)
    url: str | None = Field(None, max_length=1000)


class CustomTopicRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    subject: str = Field(..., min_length=1, max_length=200)
    grade: str = Field("", max_length=100)
    topics_text: str = Field(..., min_length=5)


# ── Upload endpoint ───────────────────────────────────────────────────────────

@router.post(
    "/upload",
    response_model=DocumentSummary,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload a PDF syllabus/textbook for ingestion",
)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="PDF file to upload"),
    subject: str = Form("", description="Subject name tag"),
    grade: str = Form("", description="Grade/level tag"),
    db: AsyncSession = Depends(get_db),
) -> DocumentSummary:
    # ── Validate ──────────────────────────────────────────────────────────────
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "invalid_file", "message": "Only PDF files are accepted."},
        )

    pdf_bytes = await file.read()
    size_mb = len(pdf_bytes) / (1024 * 1024)
    if size_mb > MAX_UPLOAD_MB:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={
                "error": "file_too_large",
                "message": f"File size {size_mb:.1f} MB exceeds {MAX_UPLOAD_MB} MB limit.",
            },
        )

    # ── Deduplication check ───────────────────────────────────────────────────
    sha256 = compute_sha256(pdf_bytes)
    existing = await db.execute(
        select(DocumentORM).where(DocumentORM.sha256_hash == sha256)
    )
    existing_doc = existing.scalar_one_or_none()

    if existing_doc is not None:
        logger.info(
            "Duplicate upload detected | sha256=%s | existing_id=%s",
            sha256[:16], existing_doc.id,
        )
        chunk_count = await _count_chunks(db, existing_doc.id)
        return _to_summary(existing_doc, chunk_count)

    # ── Save file to disk ─────────────────────────────────────────────────────
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / f"{sha256}.pdf"

    if not file_path.exists():
        file_path.write_bytes(pdf_bytes)

    # ── Create Document row ───────────────────────────────────────────────────
    doc_id = uuid.uuid4()
    doc = DocumentORM(
        id=doc_id,
        user_id=_PLACEHOLDER_USER,
        filename=file.filename,
        subject=subject.strip() or None,
        grade=grade.strip() or None,
        sha256_hash=sha256,
        status="processing",
        source="upload",
    )
    db.add(doc)
    await db.flush()      # get doc into DB before background task

    logger.info(
        "Document created | id=%s | file=%s | sha256=%s",
        doc_id, file.filename, sha256[:16],
    )

    # ── Background: parse → chunk → embed → store ────────────────────────────
    background_tasks.add_task(
        _run_ingestion, str(doc_id), sha256, pdf_bytes
    )

    return _to_summary(doc, 0)


async def _run_ingestion(
    document_id: str,
    sha256: str,
    pdf_bytes: bytes,
) -> None:
    """
    Background task: runs the full ingestion pipeline and updates doc status.
    Uses its own DB session (background tasks run after request response).
    """
    from app.database import get_async_session

    async with get_async_session() as db:
        try:
            chunk_count, page_count = await process_and_store_document(
                db=db,
                document_id=document_id,
                sha256_hash=sha256,
                pdf_bytes=pdf_bytes,
            )
            # Update document status
            result = await db.execute(
                select(DocumentORM).where(DocumentORM.id == uuid.UUID(document_id))
            )
            doc = result.scalar_one_or_none()
            if doc:
                doc.status = "ready"
                doc.page_count = page_count
            await db.commit()

            logger.info(
                "[OK] Ingestion complete | doc_id=%s | chunks=%d | pages=%d",
                document_id, chunk_count, page_count,
            )

        except Exception as exc:
            logger.error("Ingestion failed for doc_id=%s: %s", document_id, exc)
            await db.rollback()
            # Mark document as error
            async with get_async_session() as err_db:
                result = await err_db.execute(
                    select(DocumentORM).where(DocumentORM.id == uuid.UUID(document_id))
                )
                doc = result.scalar_one_or_none()
                if doc:
                    doc.status = "error"
                await err_db.commit()


# ── Web fetch endpoint ────────────────────────────────────────────────────────

@router.post(
    "/custom-topic",
    response_model=DocumentSummary,
    status_code=status.HTTP_201_CREATED,
    summary="Directly ingest custom syllabus topics, unit test chapters, or curriculum text",
)
async def create_custom_topic_document(
    body: CustomTopicRequest,
    db: AsyncSession = Depends(get_db),
) -> DocumentSummary:
    """
    Directly ingest custom syllabus topics, unit test chapters, or curriculum text.
    Immediately chunks, embeds, and indexes for instant quiz generation.
    """
    import hashlib
    from app.services.document_processor import chunk_text
    from app.services.embedding import embed_texts

    text_content = body.topics_text.strip()
    grade_label = body.grade.strip() if body.grade.strip() else "All Levels"
    formatted_content = f"Title / Scope: {body.title}\nSubject: {body.subject}\nGrade: {grade_label}\n\nTopics & Subtopics:\n{text_content}"
    
    sha256 = hashlib.sha256(formatted_content.encode()).hexdigest()

    existing = await db.execute(
        select(DocumentORM).where(DocumentORM.sha256_hash == sha256)
    )
    existing_doc = existing.scalar_one_or_none()
    if existing_doc:
        chunk_count = await _count_chunks(db, existing_doc.id)
        return _to_summary(existing_doc, chunk_count)

    doc_id = uuid.uuid4()
    doc = DocumentORM(
        id=doc_id,
        user_id=_PLACEHOLDER_USER,
        filename=f"{body.title} ({body.subject})",
        subject=body.subject,
        grade=grade_label,
        sha256_hash=sha256,
        status="ready",
        source="custom_topic",
    )
    db.add(doc)
    await db.flush()

    chunks = chunk_text(formatted_content)
    embeddings = embed_texts(chunks)

    chunk_rows = [
        DocumentChunk(
            id=uuid.uuid4(),
            document_id=doc_id,
            chunk_index=i,
            content=chunk,
            embedding=emb,
            token_count=len(chunk.split()),
        )
        for i, (chunk, emb) in enumerate(zip(chunks, embeddings))
    ]
    db.add_all(chunk_rows)
    await db.commit()

    return _to_summary(doc, len(chunk_rows))


@router.post(
    "/web-fetch",
    response_model=DocumentSummary,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Fetch syllabus from web or online PDF URL",
)
async def web_fetch_document(
    body: WebFetchRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> DocumentSummary:
    """
    Trigger search + scrape or direct online URL fetch for syllabus content.
    Stores result as a Document with source=web_fetch.
    """
    import hashlib

    fetch_key = f"web:{body.subject}:{body.grade}:{body.extra_keywords}:{body.url or ''}"
    pseudo_sha = hashlib.sha256(fetch_key.encode()).hexdigest()

    existing = await db.execute(
        select(DocumentORM).where(DocumentORM.sha256_hash == pseudo_sha)
    )
    existing_doc = existing.scalar_one_or_none()
    if existing_doc is not None:
        if existing_doc.status == "ready":
            chunk_count = await _count_chunks(db, existing_doc.id)
            return _to_summary(existing_doc, chunk_count)
        # Reuse existing record if it was previously in error/processing state
        await db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == existing_doc.id))
        existing_doc.status = "processing"
        await db.commit()
        background_tasks.add_task(
            _run_web_ingestion, str(existing_doc.id), body.subject, body.grade, body.extra_keywords, body.url
        )
        return _to_summary(existing_doc, 0)

    title_tag = f"{body.subject} {body.grade}"
    if body.url:
        title_tag = f"{body.subject} ({body.url.split('/')[-1][:20]})"
    elif body.extra_keywords:
        title_tag = f"{body.subject} - {body.extra_keywords[:25]}"

    doc_id = uuid.uuid4()
    doc = DocumentORM(
        id=doc_id,
        user_id=_PLACEHOLDER_USER,
        filename=f"{title_tag} (web)",
        subject=body.subject,
        grade=body.grade,
        sha256_hash=pseudo_sha,
        status="processing",
        source="web_fetch",
    )
    db.add(doc)
    await db.flush()

    background_tasks.add_task(
        _run_web_ingestion, str(doc_id), body.subject, body.grade, body.extra_keywords, body.url
    )

    return _to_summary(doc, 0)


async def _run_web_ingestion(
    document_id: str,
    subject: str,
    grade: str,
    extra_keywords: str,
    direct_url: str | None = None,
) -> None:
    from app.database import get_async_session

    async with get_async_session() as db:
        try:
            text = await fetch_syllabus_from_web(subject, grade, extra_keywords, direct_url=direct_url)
            if not text or len(text.strip()) < 20:
                text = (
                    f"=== Academic Syllabus for {subject} ({grade}) ===\n\n"
                    f"Core topics and concepts for {subject} {grade}.\n"
                    f"Focus: {extra_keywords if extra_keywords else 'Full Curriculum'}\n"
                )

            from app.services.document_processor import chunk_text
            from app.services.embedding import embed_texts

            chunks = chunk_text(text)
            if not chunks:
                chunks = [text]

            embeddings = embed_texts(chunks)

            doc_uuid = uuid.UUID(document_id)
            chunk_rows = [
                DocumentChunk(
                    id=uuid.uuid4(),
                    document_id=doc_uuid,
                    chunk_index=i,
                    content=chunk,
                    embedding=emb,
                    token_count=len(chunk.split()),
                )
                for i, (chunk, emb) in enumerate(zip(chunks, embeddings))
            ]
            db.add_all(chunk_rows)

            result = await db.execute(
                select(DocumentORM).where(DocumentORM.id == doc_uuid)
            )
            doc = result.scalar_one_or_none()
            if doc:
                doc.status = "ready"
                doc.page_count = None

            await db.commit()
            logger.info(
                "[OK] Web ingestion complete | doc_id=%s | chunks=%d",
                document_id, len(chunk_rows),
            )

        except Exception as exc:
            logger.error("Web ingestion failed for doc_id=%s: %s", document_id, exc)
            await db.rollback()
            async with get_async_session() as err_db:
                result = await err_db.execute(
                    select(DocumentORM).where(DocumentORM.id == uuid.UUID(document_id))
                )
                doc = result.scalar_one_or_none()
                if doc:
                    doc.status = "error"
                await err_db.commit()


# ── List endpoint ─────────────────────────────────────────────────────────────

@router.get(
    "",
    response_model=list[DocumentSummary],
    include_in_schema=False,
)
@router.get(
    "/",
    response_model=list[DocumentSummary],
    summary="List all documents in the library",
)
async def list_documents(
    db: AsyncSession = Depends(get_db),
) -> list[DocumentSummary]:
    result = await db.execute(
        select(DocumentORM)
        .where(DocumentORM.user_id == _PLACEHOLDER_USER)
        .order_by(DocumentORM.created_at.desc())
    )
    docs = result.scalars().all()
    summaries = []
    for doc in docs:
        chunk_count = await _count_chunks(db, doc.id)
        summaries.append(_to_summary(doc, chunk_count))
    return summaries


# ── Detail endpoint ───────────────────────────────────────────────────────────

@router.get(
    "/{document_id}",
    response_model=DocumentSummary,
    summary="Get document detail",
)
async def get_document(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> DocumentSummary:
    doc = await _get_or_404(document_id, db)
    chunk_count = await _count_chunks(db, doc.id)
    return _to_summary(doc, chunk_count)


# ── Delete endpoint ───────────────────────────────────────────────────────────

@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a document and all its chunks",
)
async def delete_document(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> None:
    doc = await _get_or_404(document_id, db)

    # Clear Redis cache for this doc's text
    await redis_delete(f"doc_text:{doc.sha256_hash}")

    # Delete file from disk (if uploaded)
    if doc.source == "upload":
        file_path = Path(settings.upload_dir) / f"{doc.sha256_hash}.pdf"
        if file_path.exists():
            file_path.unlink()

    # Cascade deletes chunks via FK
    await db.execute(delete(DocumentORM).where(DocumentORM.id == document_id))
    logger.info("Document deleted | id=%s", document_id)


# ── PDF Topic Text Extractor ──────────────────────────────────────────────────

class ExtractTopicsResponse(BaseModel):
    filename: str
    extracted_text: str
    word_count: int
    char_count: int
    suggested_subject: str | None = None
    suggested_title: str | None = None


@router.post(
    "/extract-topics-pdf",
    response_model=ExtractTopicsResponse,
    summary="Extract text/topics from a PDF directly for topic focus insertion",
)
async def extract_topics_from_pdf(
    file: UploadFile = File(...),
) -> ExtractTopicsResponse:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported for topic extraction.",
        )

    contents = await file.read()
    if len(contents) > 25 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds 25 MB limit.",
        )

    from app.services.document_processor import parse_pdf_bytes
    import re
    try:
        raw_text = parse_pdf_bytes(contents)
    except Exception as e:
        logger.warning("PDF topic parse failed: %s", e)
        raise HTTPException(status_code=400, detail=f"Could not extract text from PDF: {e}")

    cleaned = raw_text.strip()
    words = cleaned.split()

    # Suggest title from filename
    clean_stem = Path(file.filename).stem.replace("_", " ").replace("-", " ").title()

    # Detect subject heuristic
    suggested_subj = None
    for s in ["Physics", "Chemistry", "Mathematics", "Computer Science", "Biology", "History", "Geography", "English", "Economics"]:
        if re.search(rf"\b{s}\b", clean_stem, re.IGNORECASE) or re.search(rf"\b{s}\b", cleaned[:500], re.IGNORECASE):
            suggested_subj = s
            break

    return ExtractTopicsResponse(
        filename=file.filename,
        extracted_text=cleaned,
        word_count=len(words),
        char_count=len(cleaned),
        suggested_subject=suggested_subj,
        suggested_title=clean_stem,
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_or_404(doc_id: uuid.UUID, db: AsyncSession) -> DocumentORM:
    result = await db.execute(
        select(DocumentORM).where(
            DocumentORM.id == doc_id,
            DocumentORM.user_id == _PLACEHOLDER_USER,
        )
    )
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "document_not_found", "id": str(doc_id)},
        )
    return doc


async def _count_chunks(db: AsyncSession, doc_id: uuid.UUID) -> int:
    result = await db.execute(
        select(func.count()).where(DocumentChunk.document_id == doc_id)
    )
    return result.scalar_one() or 0


def _to_summary(doc: DocumentORM, chunk_count: int) -> DocumentSummary:
    return DocumentSummary(
        id=str(doc.id),
        filename=doc.filename,
        subject=doc.subject,
        grade=doc.grade,
        status=doc.status,
        source=doc.source,
        page_count=doc.page_count,
        chunk_count=chunk_count,
        created_at=doc.created_at.isoformat(),
    )
