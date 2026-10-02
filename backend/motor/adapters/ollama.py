from __future__ import annotations

from typing import Any

import httpx
import structlog

from motor.config import get_settings

logger = structlog.get_logger()

# Aliases de camada → nomes Ollama locais (doc original)
OLLAMA_MODEL_MAP = {
    "llama-3.1-8b-instant": "llama3.1:8b",
    "llama-3.3-70b-versatile": "llama3.3:70b",
    "mistral-nemo": "mistral-nemo:12b",
    "deepseek-r1-distill": "deepseek-r1:8b",
    "gemma2-9b-it": "gemma2:9b",
}


class OllamaClient:
    """Adapter local (Ollama) — ativar com OLLAMA_ENABLED=true quando houver GPU/RunPod."""

    def __init__(self) -> None:
        settings = get_settings()
        self._base_url = (settings.ollama_base_url or "http://localhost:11434").rstrip("/")
        self._enabled = settings.ollama_enabled

    @property
    def is_configured(self) -> bool:
        return self._enabled

    async def complete(
        self,
        model: str,
        messages: list[dict[str, str]],
        json_mode: bool = False,
        temperature: float = 0.2,
    ) -> str:
        if not self._enabled:
            raise RuntimeError("Ollama não habilitado (OLLAMA_ENABLED=false)")

        mapped = OLLAMA_MODEL_MAP.get(model, model)
        payload: dict[str, Any] = {
            "model": mapped,
            "messages": messages,
            "stream": False,
            "options": {"temperature": temperature},
        }
        if json_mode:
            payload["format"] = "json"

        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(f"{self._base_url}/api/chat", json=payload)
            response.raise_for_status()
            data = response.json()
            return (data.get("message") or {}).get("content") or ""
