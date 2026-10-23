from __future__ import annotations

from typing import Any

import structlog

from motor.config import get_settings

logger = structlog.get_logger()

# Aliases de camada → IDs Gemini (free tier). Estratégia híbrida:
# camadas 4, 5, 7 usam Gemini como primário
GEMINI_MODEL_MAP = {
    "llama-3.1-8b-instant": "gemini-2.5-flash-lite",  # Extração (camada 4)
    "mistral-nemo": "gemini-3-flash",  # Timeline (camada 5)
    "deepseek-r1-distill": "gemini-3-flash",  # Raciocínio (camada 6) - fallback
    "gemma2-9b-it": "gemini-3-flash",  # Hermenêutica (camada 7)
}


class GeminiClient:
    """Adapter Google AI Studio (Gemini) — 1.500 req/dia grátis."""

    def __init__(self) -> None:
        settings = get_settings()
        self._api_key = settings.gemini_api_key
        self._client = None
        if self._api_key:
            try:
                import google.generativeai as genai

                genai.configure(api_key=self._api_key)
                self._genai = genai
            except Exception as exc:
                logger.warning("gemini_init_failed", error=str(exc))
                self._api_key = ""

    @property
    def is_configured(self) -> bool:
        return bool(self._api_key)

    def _convert_messages(self, messages: list[dict[str, str]]) -> tuple[str, list[dict[str, Any]]]:
        """Converte formato OpenAI para Gemini (system → system_instruction)."""
        system_instruction = ""
        contents = []
        for msg in messages:
            if msg["role"] == "system":
                system_instruction = msg["content"]
            else:
                contents.append({"role": msg["role"], "parts": [msg["content"]]})
        return system_instruction, contents

    async def complete(
        self,
        model: str,
        messages: list[dict[str, str]],
        json_mode: bool = False,
        temperature: float = 0.2,
        json_schema: dict | None = None,
        schema_name: str = "motor_output",
    ) -> str:
        if not self._api_key or not self._genai:
            raise RuntimeError("Gemini API key não configurada")

        gemini_model = GEMINI_MODEL_MAP.get(model, model)
        system_instruction, contents = self._convert_messages(messages)

        kwargs: dict[str, Any] = {
            "model": gemini_model,
            "contents": contents,
            "generation_config": {
                "temperature": temperature,
                "max_output_tokens": 4096,
            },
        }

        if system_instruction:
            kwargs["system_instruction"] = system_instruction

        # Gemini não suporta json_schema strict, usa json_object mode
        if json_schema:
            logger.info("gemini_json_schema_not_supported", using="json_object")
            kwargs["generation_config"]["response_mime_type"] = "application/json"
        elif json_mode:
            kwargs["generation_config"]["response_mime_type"] = "application/json"

        try:
            genai_model = self._genai.GenerativeModel(**kwargs)
            response = await genai_model.generate_content_async(
                contents, generation_config=kwargs["generation_config"]
            )
            return response.text or ""
        except Exception as exc:
            logger.error("gemini_completion_failed", error=str(exc), model=gemini_model)
            raise


class GeminiError(Exception):
    pass
