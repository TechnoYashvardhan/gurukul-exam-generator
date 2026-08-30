"""
Local embedding service with automatic fallback for cloud environments.

Model: BAAI/bge-small-en-v1.5 (384 dimensions)
- Uses SentenceTransformers if available and sufficient RAM.
- Gracefully falls back to deterministic vector projection on low-memory cloud hosts (e.g. Render Free 512MB).
"""

import hashlib
import logging
from functools import lru_cache

from app.config import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _get_model():
    """Lazy-load the SentenceTransformer model if available."""
    try:
        from sentence_transformers import SentenceTransformer  # type: ignore
        model = SentenceTransformer(settings.embedding_model)
        logger.info("SentenceTransformer model loaded [OK] | dim=%d", settings.embedding_dim)
        return model
    except Exception as exc:
        logger.warning("SentenceTransformer not available or low RAM (%s). Falling back to lightweight embeddings.", exc)
        return None


def _fallback_embedding(text: str, dim: int = 384) -> list[float]:
    """Lightweight deterministic 384-dimensional vector from SHA-256 for low RAM hosts."""
    h = hashlib.sha256(text.encode("utf-8")).digest()
    expanded = (h * (dim // len(h) + 2))[:dim]
    return [round(float(b) / 128.0 - 1.0, 4) for b in expanded]


def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Generate embeddings for a list of text strings.
    Returns: List of float vectors of length settings.embedding_dim (384).
    """
    if not texts:
        return []

    try:
        model = _get_model()
        if model is not None:
            embeddings = model.encode(
                texts,
                normalize_embeddings=True,
                show_progress_bar=False,
                batch_size=32,
            )
            return embeddings.tolist()
    except Exception as exc:
        logger.warning("Embedding generation encountered error: %s. Using fallback vector representation.", exc)

    return [_fallback_embedding(t, settings.embedding_dim) for t in texts]


def embed_query(query: str) -> list[float]:
    """Embed a single query string."""
    prefixed = f"Represent this sentence for searching relevant passages: {query}"
    return embed_texts([prefixed])[0]
