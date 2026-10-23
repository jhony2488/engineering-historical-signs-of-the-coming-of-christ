from __future__ import annotations

from typing import Any

import httpx
import structlog

from motor.config import get_settings

logger = structlog.get_logger()

DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"

# Aliases de camada → IDs DeepSeek. Estratégia híbrida:
# camada 6 (raciocínio) usa DeepSeek como primário
DEEPSEEK_MODEL_MAP = {
    "llama-3.1-8b-instant": "deepseek-chat",  # Extração (fallback)
    "mistral-nemo": "deepseek-chat",  # Timeline (fallback)
    "deepseek-r1-distill": "deepseek-reasoner",  # Raciocínio (camada 6 - primário)
    "gemma2-9b-it": "deepseek-chat",  # Hermenêutica (fallback)
}


class DeepSeekClient:
    """Adapter DeepSeek API — 500K tokens/dia grátis, compatível OpenAI."""

    def __init__(self) -> None:
        settings = get_settings()
        self._api_key = settings.deepseek_api_key

    @property
    def is_configured(self) -> bool:
        return bool(self._api_key)

    async def complete(
        self,
        model: str,
        messages: list[dict[str, str]],
        json_mode: bool = False,
        temperature: float = 0.2,
        json_schema: dict | None = None,
        schema_name: str = "motor_output",
    ) -> str:
        if not self._api_key:
            raise RuntimeError("DeepSeek API key não configurada")

        mapped = DEEPSEEK_MODEL_MAP.get(model, model)
        payload: dict[str, Any] = {
            "model": mapped,
            "messages": messages,
            "temperature": temperature,
        }
        if json_schema:
            payload["response_format"] = {
                "type": "json_schema",
                "json_schema": {
                    "name": schema_name,
                    "strict": True,
                    "schema": json_schema,
                },
            }
        elif json_mode:
            payload["response_format"] = {"type": "json_object"}

        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(
                DEEPSEEK_URL,
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"] or ""


class DeepSeekError(Exception):
    pass
