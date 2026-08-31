"""
OpenRouter LLM client — uses OpenRouter API with multi-model free tier routing.

Top free tier models (2025/2026):
  1. meta-llama/llama-3.3-70b-instruct:free (128k context, strong reasoning & math)
  2. google/gemini-2.0-flash-exp:free (Fast, 1M context, strong structured output)
  3. qwen/qwen-2.5-coder-32b-instruct:free (Exceptional for JSON schemas & coding)
  4. deepseek/deepseek-r1:free (Deep reasoning for complex STEM problems)
  5. mistralai/mistral-small-24b-instruct-2501:free (Ultra-fast and reliable)
  6. openrouter/free (Auto-router that selects available free model)

Get a free key at: https://openrouter.ai/keys
"""

import json
import logging
import httpx

from app.config import settings
from app.llm.base import LLMClient, LLMProviderError

logger = logging.getLogger(__name__)

OPENROUTER_FALLBACK_MODELS = [
    "openrouter/auto",
    "google/gemma-4-31b-it:free",
    "google/gemma-4-26b-a4b-it:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "minimax/minimax-m3:free",
    "z-ai/glm-5.2:free",
]


class OpenRouterClient(LLMClient):
    def __init__(self) -> None:
        if not settings.openrouter_api_key:
            raise LLMProviderError(
                "openrouter",
                "OPENROUTER_API_KEY is not set. Get a free API key at https://openrouter.ai/keys and add it to your .env file.",
            )
        self._api_key = settings.openrouter_api_key
        self._model = settings.openrouter_model or "meta-llama/llama-3.3-70b-instruct:free"
        self._base_url = "https://openrouter.ai/api/v1/chat/completions"

    @property
    def provider_name(self) -> str:
        return "openrouter"

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
        models_to_try = [self._model] + [m for m in OPENROUTER_FALLBACK_MODELS if m != self._model]
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "HTTP-Referer": "https://gurukul.local",
            "X-Title": "Gurukul Exam Generator",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            for idx, model in enumerate(models_to_try):
                payload = {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message},
                    ],
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "response_format": {"type": "json_object"},
                }

                logger.debug("OpenRouter request | model=%s | max_tokens=%d", model, max_tokens)
                try:
                    res = await client.post(self._base_url, headers=headers, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        content = data["choices"][0]["message"]["content"] or ""
                        logger.info("[OK] OpenRouter response received using model: %s", model)
                        return content

                    err_text = res.text
                    logger.warning("OpenRouter model %s returned status %d: %s", model, res.status_code, err_text[:200])

                    # If rate limited (429) or model temporarily unavailable (503/404), advance to fallback model
                    if res.status_code in (429, 503, 404, 400) and idx < len(models_to_try) - 1:
                        logger.info("Falling back to next OpenRouter model: %s", models_to_try[idx + 1])
                        continue

                    # If final model failed
                    if idx == len(models_to_try) - 1:
                        raise LLMProviderError("openrouter", f"OpenRouter API returned {res.status_code}: {err_text}")

                except httpx.TimeoutException as exc:
                    if idx < len(models_to_try) - 1:
                        logger.warning("OpenRouter model %s timed out, trying %s", model, models_to_try[idx + 1])
                        continue
                    raise LLMProviderError("openrouter", "OpenRouter request timed out.", original=exc)
                except Exception as exc:
                    if idx < len(models_to_try) - 1 and not isinstance(exc, LLMProviderError):
                        continue
                    raise LLMProviderError("openrouter", f"OpenRouter generation error: {exc}", original=exc)

        raise LLMProviderError("openrouter", "Failed to generate a response from OpenRouter.")
