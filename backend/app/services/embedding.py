"""
Local embedding service using sentence-transformers.

Model: BAAI/bge-small-en-v1.5  (384 dimensions, ~130MB)
- Runs entirely on CPU — no paid API needed
- Downloaded automatically on first use via HuggingFace Hub
- Module-level singleton: loaded once, reused for all requests

Usage:
    embeddings = embed_texts(["some text", "another chunk"])
    # returns list[list[float]] of length 384 each
"""

import logging
from functools import lru_cache

from app.config import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _get_model():
    """
    Lazy-load the SentenceTransformer model — only imported and downloaded
    on first call. Subsequent calls return the cached instance instantly.
    """
    logger.info(
        "Loading embedding model: %s (first load may take ~30s to download)",
        settings.embedding_model,
    )
    # Deferred import — sentence-transformers is heavy; skip loading at startup
    from sentence_transformers import SentenceTransformer  # type: ignore

    model = SentenceTransformer(settings.embedding_model)
    logger.info("Embedding model loaded ✓ | dim=%d", settings.embedding_dim)
    return model


def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Generate embeddings for a list of text strings.

    Args:
        texts: List of strings to embed. Can be single strings or chunks.

    Returns:
        List of float vectors, each of length settings.embedding_dim (384).
    """
    if not texts:
        return []

    model = _get_model()
    # normalize_embeddings=True → unit vectors → cosine similarity = dot product
    embeddings = model.encode(
        texts,
        normalize_embeddings=True,
        show_progress_bar=False,
        batch_size=32,
    )
    return embeddings.tolist()


def embed_query(query: str) -> list[float]:
    """
    Embed a single query string. Prefixes with 'Represent this sentence for
    searching relevant passages: ' as recommended by the BGE authors.
    """
    prefixed = f"Represent this sentence for searching relevant passages: {query}"
    return embed_texts([prefixed])[0]
