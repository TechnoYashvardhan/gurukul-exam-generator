"""
LLM Abstraction Base — defines the interface every provider must implement.
Swap providers by changing LLM_PROVIDER in .env; no business logic changes needed.
"""

from abc import ABC, abstractmethod


class LLMClient(ABC):
    """
    Abstract base for all LLM provider clients.

    Implement this interface for any new provider (Groq, Gemini, Ollama, OpenAI, etc.)
    and register it in factory.py.
    """

    @abstractmethod
    async def generate(
        self,
        system_prompt: str,
        user_message: str,
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> str:
        """
        Send a chat request and return the model's text response.

        Args:
            system_prompt: Instructions / context for the model.
            user_message:  The user-turn content.
            temperature:   Sampling temperature (lower = more deterministic).
            max_tokens:    Max tokens in the completion.

        Returns:
            Raw text string from the model.

        Raises:
            LLMProviderError: On API failure, timeout, or auth error.
        """
        ...

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Human-readable provider name, e.g. 'groq'."""
        ...

    @property
    @abstractmethod
    def model_name(self) -> str:
        """The model identifier being used, e.g. 'llama-3.3-70b-versatile'."""
        ...


class LLMProviderError(Exception):
    """Raised when an LLM API call fails for any reason."""

    def __init__(self, provider: str, message: str, original: Exception | None = None):
        self.provider = provider
        self.original = original
        super().__init__(f"[{provider}] {message}")
