from __future__ import annotations

from typing import Any

import structlog

from motor.config import get_settings

logger = structlog.get_logger()

# Aliases de camada → IDs Gemini (free tier). Estratégia híbrida:
# camadas 4, 5, 7 usam Gemini como primário
GEMINI_MODEL_MAP = {
    "llama-3.1-8b-instant": "gemini-2.5-flash",  # Extração (camada 4)
    "mistral-nemo": "gemini-2.5-flash",  # Timeline (camada 5)
    "deepseek-r1-distill": "gemini-2.5-flash",  # Raciocínio (camada 6) - fallback
    "gemma2-9b-it": "gemini-2.5-flash",  # Hermenêutica (camada 7)
}


class GeminiClient:
    """Adapter Google GenAI SDK (novo pacote, substitui google.generativeai) — 1.500 req/dia grátis."""

    def __init__(self) -> None:
        settings = get_settings()
        self._api_key = settings.gemini_api_key
        self._client = None
        if self._api_key:
            try:
                from google import genai

                self._client = genai.Client(api_key=self._api_key)
                self._genai = genai
            except Exception as exc:
                logger.warning("gemini_init_failed", error=str(exc))
                self._api_key = ""

    @property
    def is_configured(self) -> bool:
        return bool(self._api_key) and self._client is not None

    def _convert_messages(self, messages: list[dict[str, str]]) -> str:
        """Converte formato OpenAI para string (concatena system + user/assistant)."""
        result = ""
        for msg in messages:
            if msg["role"] == "system":
                result += f"System: {msg['content']}\n\n"
            elif msg["role"] == "user":
                result += f"User: {msg['content']}\n\n"
            elif msg["role"] == "assistant":
                result += f"Assistant: {msg['content']}\n\n"
        return result.strip()

    async def complete(
        self,
        model: str,
        messages: list[dict[str, str]],
        json_mode: bool = False,
        temperature: float = 0.2,
        json_schema: dict | None = None,
        schema_name: str = "motor_output",
    ) -> str:
        if not self._api_key or not self._client:
            raise RuntimeError("Gemini API key não configurada")

        gemini_model = GEMINI_MODEL_MAP.get(model, model)
        content = self._convert_messages(messages)

        kwargs: dict[str, Any] = {
            "model": gemini_model,
            "contents": content,
            "config": {
                "temperature": temperature,
                "max_output_tokens": 4096,
            },
        }

        # Gemini 2.5 suporta JSON via response_mime_type
        if json_schema or json_mode:
            logger.info("gemini_json_mode", using="response_mime_type")
            kwargs["config"]["response_mime_type"] = "application/json"

        try:
            response = await self._client.aio.models.generate_content(**kwargs)
            return response.text or ""
        except Exception as exc:
            logger.error("gemini_completion_failed", error=str(exc), model=gemini_model)
            raise


class GeminiError(Exception):
    pass
