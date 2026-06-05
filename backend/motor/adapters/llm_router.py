from __future__ import annotations

import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from motor.adapters.groq import GroqClient
from motor.adapters.openrouter import OpenRouterClient

logger = structlog.get_logger()


class LLMRouter:
    def __init__(self) -> None:
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
    ) -> tuple[str, str]:
        """Retorna (conteúdo, provedor_usado)."""
        if not self._force_fallback and self._groq.is_configured:
            try:
                content = await self._groq.complete(model, messages, json_mode, temperature)
                return content, "groq"
            except Exception as exc:
                logger.warning("groq_failed_fallback", error=str(exc), model=model)

        if self._openrouter.is_configured:
            content = await self._openrouter.complete(model, messages, json_mode, temperature)
            return content, "openrouter"

        content = await self._groq.complete(model, messages, json_mode, temperature)
        return content, "dry_run"
