"""
Ollama LLM client — calls a locally running Ollama instance via HTTP.

Completely free — runs open-weight models on your machine.
Setup:
  1. Install Ollama: https://ollama.ai
  2. Pull a model: ollama pull llama3.2
  3. Set OLLAMA_BASE_URL=http://localhost:11434 in .env
     (Inside Docker: use http://host.docker.internal:11434)
"""

import logging

import httpx

from app.config import settings
from app.llm.base import LLMClient, LLMProviderError

logger = logging.getLogger(__name__)

OLLAMA_TIMEOUT = 600.0  # seconds — local inference can be slow


class OllamaClient(LLMClient):
    def __init__(self) -> None:
        self._base_url = settings.ollama_base_url.rstrip("/")
        self._model = settings.ollama_model

    @property
    def provider_name(self) -> str:
        return "ollama"

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
        logger.debug(
            "Ollama request | base_url=%s | model=%s | temp=%s",
            self._base_url, self._model, temperature,
        )
        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "stream": False,
            "format": "json",
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
                "num_ctx": 8192,
            },
        }
        try:
            async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
                response = await client.post(
                    f"{self._base_url}/api/chat",
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
                content: str = data.get("message", {}).get("content", "")
                logger.debug(
                    "Ollama response | eval_count=%s tokens",
                    data.get("eval_count", "N/A"),
                )
                return content

        except httpx.ConnectError as exc:
            logger.error("Cannot reach Ollama at %s: %s", self._base_url, exc)
            raise LLMProviderError(
                "ollama",
                f"Cannot connect to Ollama at {self._base_url}. "
                "Is Ollama running? Did you run 'ollama pull <model>'?",
                original=exc,
            )
        except httpx.TimeoutException as exc:
            logger.error("Ollama request timed out after %ss", OLLAMA_TIMEOUT)
            raise LLMProviderError(
                "ollama",
                f"Request timed out after {OLLAMA_TIMEOUT}s. "
                "Try a smaller model or increase OLLAMA_TIMEOUT.",
                original=exc,
            )
        except httpx.HTTPStatusError as exc:
            logger.error("Ollama HTTP error: %s", exc.response.text)
            raise LLMProviderError(
                "ollama",
                f"HTTP {exc.response.status_code}: {exc.response.text}",
                original=exc,
            )
