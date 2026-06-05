from __future__ import annotations

from typing import Any

import httpx
import structlog

from motor.config import get_settings

logger = structlog.get_logger()

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

MODEL_MAP = {
    "llama-3.1-8b-instant": "meta-llama/llama-3.1-8b-instruct",
    "llama-3.3-70b-versatile": "meta-llama/llama-3.3-70b-instruct",
    "mistral-nemo": "mistralai/mistral-nemo",
    "deepseek-r1-distill": "deepseek/deepseek-r1-distill-llama-70b",
    "gemma2-9b-it": "google/gemma-2-9b-it",
}


class OpenRouterClient:
    def __init__(self) -> None:
        settings = get_settings()
        self._api_key = settings.openrouter_api_key

    @property
    def is_configured(self) -> bool:
        return bool(self._api_key)

    async def complete(
        self,
        model: str,
        messages: list[dict[str, str]],
        json_mode: bool = False,
        temperature: float = 0.2,
    ) -> str:
        if not self._api_key:
            raise RuntimeError("OpenRouter API key não configurada")

        mapped = MODEL_MAP.get(model, model)
        payload: dict[str, Any] = {
            "model": mapped,
            "messages": messages,
            "temperature": temperature,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"] or ""
