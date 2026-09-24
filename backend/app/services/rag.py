"""
RAG (Retrieval-Augmented Generation) service.

Given a query string and a document_id, retrieves the top-K most
semantically relevant chunks from the document_chunks table using
pgvector's cosine similarity operator (<=>).

Usage in the generation pipeline:
  context_text = await retrieve_context(
      db=db,
      document_id="...",
      query=f"{subject} {grade} {difficulty} exam questions",
      top_k=12,
  )
  # context_text is passed to the LLM as the syllabus section
"""

import logging
import uuid
import json
import numpy as np

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.embedding import embed_query

logger = logging.getLogger(__name__)

# How many characters to include per chunk in the assembled context (tuned for Groq free tier TPM)
MAX_CONTEXT_CHARS = 20_000


async def retrieve_context_multi(
    db: AsyncSession,
    document_ids: list[str],
    query: str,
    top_k: int = 16,
) -> str:
    """
    Retrieve top-K most relevant chunks across multiple documents using cosine similarity.
    Each chunk is labeled with its source document name to ensure proper academic provenance.
    """
    if not document_ids:
        return ""

    doc_uuids: list[uuid.UUID] = []
    for did in document_ids:
        try:
            doc_uuids.append(uuid.UUID(str(did)))
        except (ValueError, TypeError):
            continue

    if not doc_uuids:
        return ""

    # Embed the query
    query_embedding = embed_query(query)
    query_vec = np.array(query_embedding)

    logger.info(
        "Multi-RAG retrieval | doc_ids=%s | query_len=%d | top_k=%d",
        document_ids, len(query), top_k,
    )

    from app.models.db import DocumentChunk, Document as DocumentORM
    from sqlalchemy import select

    stmt = (
        select(DocumentChunk.content, DocumentChunk.embedding, DocumentORM.filename)
        .join(DocumentORM, DocumentChunk.document_id == DocumentORM.id)
        .where(DocumentChunk.document_id.in_(doc_uuids))
    )
    result = await db.execute(stmt)
    rows = result.all()

    if not rows:
        logger.warning("RAG: No chunks found for document_ids=%s", document_ids)
        return ""

    scored_chunks = []
    for chunk_text, emb_val, filename in rows:
        if emb_val is None:
            continue
        if isinstance(emb_val, str):
            chunk_vec = np.array(json.loads(emb_val))
        else:
            chunk_vec = np.array(emb_val)

        norm_q = np.linalg.norm(query_vec)
        norm_c = np.linalg.norm(chunk_vec)
        if norm_q == 0 or norm_c == 0:
            distance = 1.0
        else:
            sim = np.dot(query_vec, chunk_vec) / (norm_q * norm_c)
            distance = 1.0 - sim

        scored_chunks.append({
            "content": chunk_text,
            "filename": filename,
            "distance": distance,
        })

    # Sort by distance (lower is better) and take top_k
    scored_chunks.sort(key=lambda x: x["distance"])
    scored_chunks = scored_chunks[:top_k]

    # Assemble context, respecting MAX_CONTEXT_CHARS
    parts: list[str] = []
    total = 0
    for i, chunk in enumerate(scored_chunks):
        chunk_text = chunk["content"]
        fname = chunk["filename"]
        distance = chunk["distance"]
        header = f"\n--- [Source: {fname}] Chunk {i + 1} (relevance: {1 - distance:.2f}) ---\n"
        parts.append(header + chunk_text)
        total += len(chunk_text)
        if total >= MAX_CONTEXT_CHARS:
            break

    context = "".join(parts)[:MAX_CONTEXT_CHARS]
    logger.info(
        "[OK] Multi-RAG retrieved %d chunks across %d docs | context_len=%d",
        len(scored_chunks), len(doc_uuids), len(context),
    )
    return context


async def retrieve_context(
    db: AsyncSession,
    document_id: str,
    query: str,
    top_k: int = 12,
) -> str:
    """
    Retrieve the top-K most relevant chunks from a document using cosine similarity.
    Delegates to retrieve_context_multi.
    """
    return await retrieve_context_multi(db=db, document_ids=[document_id], query=query, top_k=top_k)


async def retrieve_all_text(
    db: AsyncSession,
    document_id: str,
) -> str:
    """
    Retrieve ALL chunks from a document ordered by chunk_index.
    Used when no specific query is provided (e.g., small documents).
    """
    doc_uuid = uuid.UUID(document_id)
    sql = text("""
        SELECT content
        FROM document_chunks
        WHERE document_id = :doc_id
        ORDER BY chunk_index
    """)
    result = await db.execute(sql, {"doc_id": doc_uuid.hex})
    rows = result.fetchall()
    return "\n\n".join(r.content for r in rows)[:MAX_CONTEXT_CHARS]
