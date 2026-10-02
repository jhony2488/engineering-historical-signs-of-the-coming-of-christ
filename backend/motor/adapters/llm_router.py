from __future__ import annotations

import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from motor.adapters.groq import GroqClient
from motor.adapters.local_llm import LocalLlamaClient
from motor.adapters.ollama import OllamaClient
from motor.adapters.openrouter import OpenRouterClient
from motor.config import get_settings

logger = structlog.get_logger()


class LLMRouter:
    """Ordem: Local GGUF (se habilitado) → Ollama → Groq → OpenRouter → dry-run via GroqClient."""

    def __init__(self) -> None:
        self._local = LocalLlamaClient()
        self._ollama = OllamaClient()
        self._groq = GroqClient()
        self._openrouter = OpenRouterClient()
        self._force_fallback = False

    def force_fallback(self, enabled: bool = True) -> None:
        self._force_fallback = enabled

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=8))
    async def complete(
        self,
        model: str,
        messages: list[dict[str, str]],
        json_mode: bool = False,
        temperature: float = 0.2,
        json_schema: dict | None = None,
        schema_name: str = "motor_output",
    ) -> tuple[str, str]:
        """Retorna (conteúdo, provedor_usado).

        `json_schema` ativa enforcement de formato na API do provedor
        (`response_format` json_schema / `format` no Ollama); sem ele,
        `json_mode` garante apenas JSON válido.
        """
        settings = get_settings()
        prefer_local = settings.local_llm_enabled and not self._force_fallback
        prefer_ollama = settings.ollama_enabled and not self._force_fallback
        kw = {"json_schema": json_schema, "schema_name": schema_name}

        if prefer_local and self._local.is_configured:
            try:
                content = await self._local.complete(model, messages, json_mode, temperature, **kw)
                return content, "local_gguf"
            except Exception as exc:
                logger.warning("local_llm_failed_fallback", error=str(exc), model=model)

        if prefer_ollama and self._ollama.is_configured:
            try:
                content = await self._ollama.complete(model, messages, json_mode, temperature, **kw)
                return content, "ollama"
            except Exception as exc:
                logger.warning("ollama_failed_fallback", error=str(exc), model=model)

        if not self._force_fallback and self._groq.is_configured:
            try:
                content = await self._groq.complete(model, messages, json_mode, temperature, **kw)
                return content, "groq"
            except Exception as exc:
                logger.warning("groq_failed_fallback", error=str(exc), model=model)

        if self._openrouter.is_configured:
            content = await self._openrouter.complete(model, messages, json_mode, temperature, **kw)
            return content, "openrouter"

        content = await self._groq.complete(model, messages, json_mode, temperature, **kw)
        return content, "dry_run"
