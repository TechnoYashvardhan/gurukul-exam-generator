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


async def retrieve_context(
    db: AsyncSession,
    document_id: str,
    query: str,
    top_k: int = 12,
) -> str:
    """
    Retrieve the top-K most relevant chunks from a document using cosine similarity.

    Args:
        db:          Async DB session.
        document_id: UUID of the document to search within.
        query:       Free-text query describing the exam topic/focus.
        top_k:       Number of chunks to retrieve.

    Returns:
        Concatenated chunk texts ordered by relevance (best first),
        trimmed to MAX_CONTEXT_CHARS.
    """
    doc_uuid = uuid.UUID(document_id)

    # Embed the query using the same model as the stored chunks
    query_embedding = embed_query(query)
    query_vec_str = f"[{','.join(str(x) for x in query_embedding)}]"

    logger.info(
        "RAG retrieval | doc_id=%s | query_len=%d | top_k=%d",
        document_id, len(query), top_k,
    )

    # Fetch all chunks for this document
    sql = text("""
        SELECT content, embedding
        FROM document_chunks
        WHERE document_id = :doc_id
    """)

    result = await db.execute(
        sql,
        {
            "doc_id": doc_uuid.hex,
        },
    )
    rows = result.fetchall()

    if not rows:
        logger.warning(
            "RAG: No chunks found for document_id=%s", document_id
        )
        return ""

    # Compute cosine similarity manually for SQLite
    query_vec = np.array(query_embedding)
    
    scored_chunks = []
    for row in rows:
        chunk_text = row.content
        emb_val = row.embedding
        
        if emb_val is None:
            continue
            
        if isinstance(emb_val, str):
            chunk_vec = np.array(json.loads(emb_val))
        else:
            chunk_vec = np.array(emb_val)
            
        # Cosine distance = 1 - Cosine Similarity
        # Similarity = dot(A, B) / (norm(A) * norm(B))
        norm_q = np.linalg.norm(query_vec)
        norm_c = np.linalg.norm(chunk_vec)
        if norm_q == 0 or norm_c == 0:
            distance = 1.0
        else:
            sim = np.dot(query_vec, chunk_vec) / (norm_q * norm_c)
            distance = 1.0 - sim
            
        scored_chunks.append({"content": chunk_text, "distance": distance})
        
    # Sort by distance (lower is better) and take top_k
    scored_chunks.sort(key=lambda x: x["distance"])
    scored_chunks = scored_chunks[:top_k]

    # Assemble context, most relevant first
    parts: list[str] = []
    total = 0
    for i, chunk in enumerate(scored_chunks):
        chunk_text = chunk["content"]
        distance = chunk["distance"]
        header = f"\n--- Chunk {i + 1} (relevance: {1 - distance:.2f}) ---\n"
        parts.append(header + chunk_text)
        total += len(chunk_text)
        if total >= MAX_CONTEXT_CHARS:
            break

    context = "".join(parts)[:MAX_CONTEXT_CHARS]
    logger.info(
        "[OK] RAG retrieved %d chunks | doc_id=%s | context_len=%d",
        len(rows), document_id, len(context),
    )
    return context


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
