"""
Groq LLM client — ultra-fast LPU inference via direct async HTTP.
"""

import logging
import httpx
import re

from app.config import settings
from app.llm.base import LLMClient, LLMProviderError

logger = logging.getLogger(__name__)

FALLBACK_MODELS = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
]


class GroqClient(LLMClient):
    def __init__(self) -> None:
        if not settings.groq_api_key:
            raise LLMProviderError(
                "groq",
                "GROQ_API_KEY is not set. Get a free key at https://console.groq.com",
            )
        self._api_key = settings.groq_api_key
        self._model = settings.groq_model or "openai/gpt-oss-120b"
        self._base_url = "https://api.groq.com/openai/v1/chat/completions"

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
        models_to_try = [self._model] + [m for m in FALLBACK_MODELS if m != self._model]
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            for idx, model in enumerate(models_to_try):
                payload = {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message},
                    ],
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                }

                logger.debug("Groq request | model=%s | max_tokens=%d", model, max_tokens)
                try:
                    res = await client.post(self._base_url, headers=headers, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        content = data["choices"][0]["message"]["content"] or ""
                        logger.info("[OK] Groq response received using model: %s", model)
                        return content

                    err_text = res.text
                    logger.warning("Groq model %s returned %d: %s", model, res.status_code, err_text[:200])
                    if res.status_code in (429, 503, 404, 400) and idx < len(models_to_try) - 1:
                        logger.info("Falling back to next Groq model: %s", models_to_try[idx + 1])
                        continue
                except Exception as exc:
                    logger.warning("Groq error on %s: %s", model, exc)
                    if idx < len(models_to_try) - 1:
                        continue

        raise LLMProviderError("groq", "Failed to generate a response from Groq.")
