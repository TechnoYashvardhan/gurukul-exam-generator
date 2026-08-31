"""
Gemini LLM client — uses Google's Generative AI SDK with auto-model fallback.
"""

import logging

import google.generativeai as genai
from google.generativeai.types import GenerationConfig
from google.api_core.exceptions import ResourceExhausted, DeadlineExceeded, GoogleAPIError

from app.config import settings
from app.llm.base import LLMClient, LLMProviderError

logger = logging.getLogger(__name__)

FALLBACK_MODELS = [
    "models/gemini-3.5-flash",
    "models/gemini-3.5-flash-lite",
    "models/gemini-3.6-flash",
    "models/gemini-3.7-flash",
    "models/gemini-flash-latest",
    "models/gemini-flash-lite-latest",
]


class GeminiClient(LLMClient):
    def __init__(self) -> None:
        if not settings.gemini_api_key:
            raise LLMProviderError(
                "gemini",
                "GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com",
            )
        genai.configure(api_key=settings.gemini_api_key)
        self._model_name = settings.gemini_model or "models/gemini-2.0-flash"

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
        models_to_try = [self._model_name] + [m for m in FALLBACK_MODELS if m != self._model_name]
        is_json = "json" in system_prompt.lower() or "json" in user_message.lower()

        last_error = None
        for candidate_model in models_to_try:
            try:
                model = genai.GenerativeModel(
                    model_name=candidate_model,
                    system_instruction=system_prompt,
                )
                config_kwargs = {
                    "temperature": temperature,
                    "max_output_tokens": max_tokens,
                }
                if is_json:
                    config_kwargs["response_mime_type"] = "application/json"

                generation_config = GenerationConfig(**config_kwargs)
                response = await model.generate_content_async(
                    user_message,
                    generation_config=generation_config,
                )
                content = response.text or ""
                self._model_name = candidate_model
                logger.debug("Gemini response received from %s | length=%d chars", candidate_model, len(content))
                return content

            except ResourceExhausted as exc:
                logger.warning("Gemini quota exhausted on %s: %s. Fast-routing to ultra-fast Groq/OpenRouter fallback...", candidate_model, exc)
                last_error = exc
                if settings.groq_api_key:
                    try:
                        from app.llm.groq_client import GroqClient
                        groq = GroqClient()
                        return await groq.generate(system_prompt, user_message, temperature, max_tokens)
                    except Exception as groq_err:
                        logger.error("Groq fallback failed: %s", groq_err)
                if settings.openrouter_api_key:
                    try:
                        from app.llm.openrouter_client import OpenRouterClient
                        openrouter = OpenRouterClient()
                        return await openrouter.generate(system_prompt, user_message, temperature, max_tokens)
                    except Exception as router_err:
                        logger.error("OpenRouter fallback failed: %s", router_err)
                break
            except DeadlineExceeded as exc:
                logger.error("Gemini request timed out on %s: %s", candidate_model, exc)
                last_error = exc
            except GoogleAPIError as exc:
                logger.warning("Gemini API error on model %s: %s. Trying next candidate...", candidate_model, exc)
                last_error = exc
            except Exception as exc:
                logger.warning("Gemini error on %s: %s", candidate_model, exc)
                last_error = exc

        # Automatic fallback to OpenRouter when Gemini quota is exhausted
        if settings.openrouter_api_key:
            logger.info("[FALLBACK] All Gemini models exhausted. Seamlessly routing to OpenRouter (Llama 3.3 70B)...")
            try:
                from app.llm.openrouter_client import OpenRouterClient
                openrouter = OpenRouterClient()
                return await openrouter.generate(system_prompt, user_message, temperature, max_tokens)
            except Exception as router_err:
                logger.error("OpenRouter fallback also failed: %s", router_err)

        raise LLMProviderError("gemini", f"All Gemini model candidates failed. Last error: {last_error}", original=last_error)
