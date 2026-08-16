"""
Gemini LLM client — uses Google's generativeai SDK.

Free tier (as of 2025):
  - No credit card required
  - 1,500 requests/day for Gemini 1.5 Flash
  - 1,000,000 tokens/minute for Gemini 1.5 Flash
  - Get your key at: https://aistudio.google.com → Get API Key
"""

import logging

import google.generativeai as genai
from google.generativeai.types import GenerationConfig
from google.api_core.exceptions import ResourceExhausted, DeadlineExceeded, GoogleAPIError

from app.config import settings
from app.llm.base import LLMClient, LLMProviderError

logger = logging.getLogger(__name__)


class GeminiClient(LLMClient):
    def __init__(self) -> None:
        if not settings.gemini_api_key:
            raise LLMProviderError(
                "gemini",
                "GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com",
            )
        genai.configure(api_key=settings.gemini_api_key)
        self._model_name = settings.gemini_model

    @property
    def provider_name(self) -> str:
        return "gemini"

    @property
    def model_name(self) -> str:
        return self._model_name

    async def generate(
        self,
        system_prompt: str,
        user_message: str,
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> str:
        logger.debug(
            "Gemini request | model=%s | temp=%s | max_tokens=%d",
            self._model_name, temperature, max_tokens,
        )
        try:
            model = genai.GenerativeModel(
                model_name=self._model_name,
                system_instruction=system_prompt,
            )
            generation_config = GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            )
            response = await model.generate_content_async(
                user_message,
                generation_config=generation_config,
            )
            content = response.text or ""
            logger.debug("Gemini response received | length=%d chars", len(content))
            return content

        except ResourceExhausted as exc:
            logger.warning("Gemini quota exhausted: %s", exc)
            raise LLMProviderError(
                "gemini",
                "Quota exhausted. Free tier: 1,500 req/day for Gemini 1.5 Flash.",
                original=exc,
            )
        except DeadlineExceeded as exc:
            logger.error("Gemini request timed out: %s", exc)
            raise LLMProviderError("gemini", "Request timed out.", original=exc)
        except GoogleAPIError as exc:
            logger.error("Gemini API error: %s", exc)
            raise LLMProviderError("gemini", f"API error: {exc}", original=exc)
