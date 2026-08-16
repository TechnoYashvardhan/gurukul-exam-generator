"""
Document ingestion pipeline.

PDF → Raw Text (PyMuPDF → pdfplumber fallback → Tesseract OCR fallback)
     → Chunks (sliding window, word-based)
     → Embeddings (local sentence-transformers)
     → Stored in PostgreSQL document_chunks with pgvector column

Deduplication:
  - SHA-256 hash is computed on the raw file bytes before any processing
  - If the hash already exists in the documents table, reuse is signalled
    back to the router (no re-processing happens)
  - Redis caches the extracted raw text keyed by sha256 hash for faster
    re-fetch without touching disk

Flow:
  1. compute_sha256(bytes) → str
  2. parse_pdf_bytes(bytes) → str           (PyMuPDF → pdfplumber → OCR)
  3. chunk_text(text) → list[str]
  4. embed_chunks(chunks) → list[list[float]]
  5. store_chunks(db, document_id, chunks, embeddings)
"""

import hashlib
import io
import logging
import re
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.db import DocumentChunk
from app.services.embedding import embed_texts
from app.services.redis_client import redis_get, redis_set

logger = logging.getLogger(__name__)


# ── SHA-256 hashing ───────────────────────────────────────────────────────────

def compute_sha256(data: bytes) -> str:
    """Compute a hex SHA-256 digest of raw file bytes."""
    return hashlib.sha256(data).hexdigest()


# ── PDF text extraction ───────────────────────────────────────────────────────

def _extract_with_pymupdf(data: bytes) -> str:
    """Primary extractor: PyMuPDF (fitz). Fast and handles most PDFs."""
    import fitz  # type: ignore  (PyMuPDF)

    text_parts: list[str] = []
    with fitz.open(stream=data, filetype="pdf") as doc:
        for page in doc:
            text_parts.append(page.get_text("text"))

    return "\n".join(text_parts)


def _extract_with_pdfplumber(data: bytes) -> str:
    """Fallback extractor: pdfplumber. Better with tabular/complex layouts."""
    import pdfplumber  # type: ignore

    text_parts: list[str] = []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                text_parts.append(t)

    return "\n".join(text_parts)


def _extract_with_ocr(data: bytes) -> str:
    """
    Last-resort: Tesseract OCR. Used when PDF is scanned / image-based.
    Requires Tesseract installed on the host system.
    """
    import fitz  # type: ignore
    import pytesseract  # type: ignore
    from PIL import Image  # type: ignore (Pillow, installed with pytesseract)

    text_parts: list[str] = []
    with fitz.open(stream=data, filetype="pdf") as doc:
        for page_num, page in enumerate(doc):
            # Render page to 300 DPI image for better OCR accuracy
            matrix = fitz.Matrix(300 / 72, 300 / 72)
            pix = page.get_pixmap(matrix=matrix, alpha=False)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            text = pytesseract.image_to_string(img)
            text_parts.append(text)
            logger.debug("OCR page %d: %d chars", page_num + 1, len(text))

    return "\n".join(text_parts)


def parse_pdf_bytes(data: bytes) -> tuple[str, int]:
    """
    Extract text from PDF bytes using a cascade of strategies.

    Returns:
        (text, page_count) tuple.

    Strategy:
      1. PyMuPDF  — fast, native PDF text layer
      2. pdfplumber — better for complex/tabular layouts
      3. Tesseract OCR — for scanned/image PDFs (slow but thorough)
    """
    # Try PyMuPDF first
    try:
        text = _extract_with_pymupdf(data)
        import fitz  # type: ignore
        with fitz.open(stream=data, filetype="pdf") as doc:
            page_count = len(doc)

        if len(text.strip()) >= 100:
            logger.info("PDF parsed with PyMuPDF | pages=%d | chars=%d", page_count, len(text))
            return text, page_count
        logger.warning("PyMuPDF returned sparse text (%d chars), trying pdfplumber", len(text.strip()))
    except Exception as exc:
        logger.warning("PyMuPDF failed: %s — falling back to pdfplumber", exc)
        page_count = 0

    # Fallback: pdfplumber
    try:
        text = _extract_with_pdfplumber(data)
        if len(text.strip()) >= 100:
            logger.info("PDF parsed with pdfplumber | chars=%d", len(text))
            return text, page_count
        logger.warning("pdfplumber returned sparse text (%d chars), attempting OCR", len(text.strip()))
    except Exception as exc:
        logger.warning("pdfplumber failed: %s — falling back to OCR", exc)

    # Last resort: OCR
    try:
        text = _extract_with_ocr(data)
        logger.info("PDF parsed with OCR | chars=%d", len(text))
        return text, page_count
    except Exception as exc:
        logger.error("All extraction methods failed: %s", exc)
        raise RuntimeError(
            "Could not extract text from this PDF. "
            "Ensure the file is a valid PDF. "
            f"Last error: {exc}"
        )


# ── Text chunking ─────────────────────────────────────────────────────────────

def _clean_text(text: str) -> str:
    """Remove excessive whitespace and non-printable characters."""
    # Collapse runs of whitespace (but keep single newlines as sentence breaks)
    text = re.sub(r"[^\S\n]+", " ", text)
    # Collapse multiple blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def chunk_text(text: str) -> list[str]:
    """
    Split text into overlapping chunks using a sliding word window.

    Settings (from config):
        chunk_size:    target number of words per chunk (default 512)
        chunk_overlap: words shared between consecutive chunks (default 64)

    Returns:
        List of text chunk strings.
    """
    text = _clean_text(text)
    words = text.split()
    if not words:
        return []

    size = settings.chunk_size
    overlap = settings.chunk_overlap
    step = size - overlap
    chunks: list[str] = []

    start = 0
    while start < len(words):
        end = min(start + size, len(words))
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        if end == len(words):
            break
        start += step

    logger.debug(
        "Chunked %d words → %d chunks (size=%d, overlap=%d)",
        len(words), len(chunks), size, overlap,
    )
    return chunks


# ── Full pipeline ─────────────────────────────────────────────────────────────

async def process_and_store_document(
    db: AsyncSession,
    document_id: str,
    sha256_hash: str,
    pdf_bytes: bytes,
) -> tuple[int, int]:
    """
    Run the full ingestion pipeline for a newly uploaded document.

    Steps:
      1. Check Redis cache for already-parsed text
      2. If cache miss: parse PDF bytes → extract text
      3. Cache the extracted text in Redis
      4. Chunk the text
      5. Generate embeddings (local sentence-transformers)
      6. Bulk-insert DocumentChunk rows

    Args:
        db:           Async DB session (transaction managed by caller).
        document_id:  UUID string of the Document row already created.
        sha256_hash:  Used as Redis cache key.
        pdf_bytes:    Raw PDF file bytes.

    Returns:
        (chunk_count, page_count) tuple.
    """
    import uuid

    # ── Step 1: Cache check ──────────────────────────────────────────────────
    cache_key = f"doc_text:{sha256_hash}"
    cached_text = await redis_get(cache_key)

    if cached_text:
        logger.info(
            "Cache hit for sha256=%s — skipping PDF parse", sha256_hash[:16]
        )
        text = cached_text
        page_count = 0  # Not re-derivable from cache; acceptable
    else:
        # ── Step 2: Parse PDF ────────────────────────────────────────────────
        text, page_count = parse_pdf_bytes(pdf_bytes)

        # ── Step 3: Cache extracted text ─────────────────────────────────────
        await redis_set(cache_key, text, ttl=settings.doc_cache_ttl)

    if not text.strip():
        raise ValueError("Extracted text is empty. The PDF may be blank or corrupt.")

    # ── Step 4: Chunk ────────────────────────────────────────────────────────
    chunks = chunk_text(text)
    if not chunks:
        raise ValueError("Chunking produced zero chunks. Text may be too short.")

    # ── Step 5: Embed ────────────────────────────────────────────────────────
    logger.info(
        "Generating embeddings for %d chunks | doc_id=%s",
        len(chunks), document_id,
    )
    embeddings = embed_texts(chunks)

    # ── Step 6: Store chunks ─────────────────────────────────────────────────
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
    # Caller commits the transaction

    logger.info(
        "✓ Document processed | doc_id=%s | chunks=%d | pages=%d",
        document_id, len(chunk_rows), page_count,
    )
    return len(chunk_rows), page_count
