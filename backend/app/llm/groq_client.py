"""
Groq LLM client — uses the official groq Python SDK.

Free tier (as of 2025):
  - No credit card required
  - ~14,400 requests/day on Llama 3.3 70B Versatile
  - 6,000 tokens/minute on Llama 3.3 70B
  - Get your key at: https://console.groq.com → API Keys → Create API Key
"""

import logging

from groq import AsyncGroq, APIError, APITimeoutError, RateLimitError

from app.config import settings
from app.llm.base import LLMClient, LLMProviderError

logger = logging.getLogger(__name__)


FALLBACK_MODELS = [
    "llama-3.1-8b-instant",
    "gemma2-9b-it",
]


class GroqClient(LLMClient):
    def __init__(self) -> None:
        if not settings.groq_api_key:
            raise LLMProviderError(
                "groq",
                "GROQ_API_KEY is not set. Get a free key at https://console.groq.com",
            )
        self._client = AsyncGroq(api_key=settings.groq_api_key)
        self._model = settings.groq_model

    @property
    def provider_name(self) -> str:
        return "groq"

    @property
    def model_name(self) -> str:
        return self._model

    async def generate(
        self,
        system_prompt: str,
        user_message: str,
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> str:
        import re
        models_to_try = [self._model] + [m for m in FALLBACK_MODELS if m != self._model]

        for idx, model in enumerate(models_to_try):
            current_max_tokens = max_tokens
            while True:
                logger.debug(
                    "Groq request | model=%s | temp=%s | max_tokens=%d",
                    model, temperature, current_max_tokens,
                )
                try:
                    response = await self._client.chat.completions.create(
                        model=model,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_message},
                        ],
                        temperature=temperature,
                        max_tokens=current_max_tokens,
                    )
                    content = response.choices[0].message.content or ""
                    logger.info("✓ Groq response received using model: %s", model)
                    return content

                except (APIError, RateLimitError, APITimeoutError) as exc:
                    exc_str = str(exc)
                    
                    # 1. Check for TPM limit (Error 413 Request Too Large)
                    if "tokens per minute (TPM): Limit" in exc_str and "Requested" in exc_str:
                        limit_match = re.search(r"Limit (\d+),\s*Requested (\d+)", exc_str)
                        if limit_match:
                            limit = int(limit_match.group(1))
                            requested = int(limit_match.group(2))
                            prompt_tokens = requested - current_max_tokens
                            new_max_tokens = max(200, limit - prompt_tokens - 50)
                            
                            if new_max_tokens < current_max_tokens:
                                logger.warning(
                                    "Groq TPM limit hit on %s. Scaling max_tokens from %d down to %d and retrying...",
                                    model, current_max_tokens, new_max_tokens
                                )
                                current_max_tokens = new_max_tokens
                                continue  # Retry same model with reduced tokens

                    # 2. Check for general TPD / RateLimit
                    if isinstance(exc, RateLimitError) or "rate_limit_exceeded" in exc_str:
                        if idx < len(models_to_try) - 1:
                            logger.warning(
                                "Groq rate limit on %s: %s — falling back to %s",
                                model, exc, models_to_try[idx + 1]
                            )
                            break  # Break while loop -> advance to next model
                        
                        logger.warning("All Groq models rate-limited: %s", exc)
                        raise LLMProviderError(
                            "groq",
                            "All Groq models have reached their free tier rate limits. Please try again later or provide a Gemini API key.",
                            original=exc,
                        )
                    
                    # 3. Handle other API errors
                    if isinstance(exc, APITimeoutError):
                        logger.error("Groq request timed out: %s", exc)
                        raise LLMProviderError("groq", "Request timed out.", original=exc)
                    else:
                        logger.error("Groq API error: %s", exc)
                        raise LLMProviderError("groq", f"API error: {exc}", original=exc)

        raise LLMProviderError("groq", "Failed to generate a response from Groq.")
