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
    extra_keywords: str = Field("", max_length=200)


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
    from app.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
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
            async with AsyncSessionLocal() as err_db:
                result = await err_db.execute(
                    select(DocumentORM).where(DocumentORM.id == uuid.UUID(document_id))
                )
                doc = result.scalar_one_or_none()
                if doc:
                    doc.status = "error"
                await err_db.commit()


# ── Web fetch endpoint ────────────────────────────────────────────────────────

@router.post(
    "/web-fetch",
    response_model=DocumentSummary,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Fetch syllabus from web via SearXNG",
)
async def web_fetch_document(
    body: WebFetchRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> DocumentSummary:
    """
    Trigger a SearXNG search + scrape for syllabus content.
    Stores result as a Document with source=web_fetch.
    """
    import hashlib

    # Create a pseudo-sha for this web fetch to use as dedup key
    fetch_key = f"web:{body.subject}:{body.grade}:{body.extra_keywords}"
    pseudo_sha = hashlib.sha256(fetch_key.encode()).hexdigest()

    # Dedup: if same subject+grade was already fetched, return existing
    existing = await db.execute(
        select(DocumentORM).where(DocumentORM.sha256_hash == pseudo_sha)
    )
    existing_doc = existing.scalar_one_or_none()
    if existing_doc and existing_doc.status == "ready":
        chunk_count = await _count_chunks(db, existing_doc.id)
        return _to_summary(existing_doc, chunk_count)

    doc_id = uuid.uuid4()
    doc = DocumentORM(
        id=doc_id,
        user_id=_PLACEHOLDER_USER,
        filename=f"{body.subject} {body.grade} (web)",
        subject=body.subject,
        grade=body.grade,
        sha256_hash=pseudo_sha,
        status="processing",
        source="web_fetch",
    )
    db.add(doc)
    await db.flush()

    background_tasks.add_task(
        _run_web_ingestion, str(doc_id), body.subject, body.grade, body.extra_keywords
    )

    return _to_summary(doc, 0)


async def _run_web_ingestion(
    document_id: str,
    subject: str,
    grade: str,
    extra_keywords: str,
) -> None:
    from app.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        try:
            text = await fetch_syllabus_from_web(subject, grade, extra_keywords)

            from app.services.document_processor import chunk_text
            from app.services.embedding import embed_texts

            chunks = chunk_text(text)
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
            async with AsyncSessionLocal() as err_db:
                result = await err_db.execute(
                    select(DocumentORM).where(DocumentORM.id == uuid.UUID(document_id))
                )
                doc = result.scalar_one_or_none()
                if doc:
                    doc.status = "error"
                await err_db.commit()


# ── List endpoint ─────────────────────────────────────────────────────────────

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
