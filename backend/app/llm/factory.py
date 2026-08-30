"""
LLM Client Factory — the single point where provider selection happens.

To switch providers: set LLM_PROVIDER=groq|gemini|ollama in your .env file.
No other code needs to change.
"""

import logging

from app.config import settings
from app.llm.base import LLMClient, LLMProviderError

logger = logging.getLogger(__name__)

# Lazy imports inside functions to avoid loading unused SDKs at startup


def get_llm_client(provider: str | None = None) -> LLMClient:
    """
    Return an instantiated LLMClient for the given (or configured) provider.

    Args:
        provider: Override the LLM_PROVIDER env var. Useful in tests.

    Returns:
        An LLMClient implementation ready to call.

    Raises:
        LLMProviderError: If the provider is unknown or misconfigured.
    """
    resolved = provider or settings.llm_provider
    logger.info("Using LLM provider: %s", resolved)

    match resolved.lower():
        case "groq":
            from app.llm.groq_client import GroqClient
            return GroqClient()

        case "gemini":
            from app.llm.gemini_client import GeminiClient
            return GeminiClient()

        case "ollama":
            from app.llm.ollama_client import OllamaClient
            return OllamaClient()

        case "openrouter":
            from app.llm.openrouter_client import OpenRouterClient
            return OpenRouterClient()

        case _:
            raise LLMProviderError(
                resolved,
                f"Unknown provider '{resolved}'. "
                "Valid values: groq | gemini | openrouter | ollama. "
                "Set LLM_PROVIDER in your .env file.",
            )
