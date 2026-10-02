from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any

import structlog

from motor.config import get_settings

logger = structlog.get_logger()

# Alias de camada → cascata ordenada de candidatos GGUF (maior → menor).
# Cada candidato tem perfil de parâmetros otimizado para seu tamanho:
# modelos maiores toleram mais contexto/temperatura; menores operam mais
# determinísticos (temperature=0, repeat_penalty maior, max_tokens contido).
#
# Só a camada 4 (extração) está mapeada nesta fase — aliases sem entrada aqui
# caem direto na cadeia cloud (Groq/OpenRouter) via LLMRouter.
LOCAL_MODEL_MAP: dict[str, list[dict[str, Any]]] = {
    "llama-3.1-8b-instant": [
        {
            "file": "qwen2.5-7b-instruct-q4_k_m.gguf",
            "hf_repo": "Qwen/Qwen2.5-7B-Instruct-GGUF",
            "n_ctx": 8192,
            "n_threads": 4,
            "max_tokens": 1024,
            "temperature": 0.1,
            "top_p": 0.9,
            "repeat_penalty": 1.05,
        },
        {
            "file": "qwen2.5-3b-instruct-q4_k_m.gguf",
            "hf_repo": "Qwen/Qwen2.5-3B-Instruct-GGUF",
            "n_ctx": 8192,
            "n_threads": 4,
            "max_tokens": 768,
            "temperature": 0.0,
            "top_p": 0.85,
            "repeat_penalty": 1.1,
        },
        {
            "file": "qwen2.5-1.5b-instruct-q4_k_m.gguf",
            "hf_repo": "Qwen/Qwen2.5-1.5B-Instruct-GGUF",
            "n_ctx": 4096,
            "n_threads": 4,
            "max_tokens": 512,
            "temperature": 0.0,
            "top_p": 0.8,
            "repeat_penalty": 1.15,
        },
    ],
}


def iter_candidates() -> list[dict[str, Any]]:
    """Todos os candidatos mapeados (uso do script download_models.py)."""
    return [c for candidates in LOCAL_MODEL_MAP.values() for c in candidates]


class LocalLlamaClient:
    """SLM local in-process via llama.cpp (GGUF em RAM, CPU-only).

    Sem servidor: o peso é carregado no próprio processo (análogo ao WebLLM,
    mas CPU em vez de WebGPU). Cada alias resolve para uma cascata de
    candidatos — tenta o maior; em arquivo ausente, falha de load ou de
    inferência, degrada para o próximo; se todos falharem, levanta exceção e
    o LLMRouter cai no provedor seguinte (Ollama → Groq → OpenRouter → dry-run).
    """

    def __init__(self) -> None:
        settings = get_settings()
        self._enabled = settings.local_llm_enabled
        self._models_dir = Path(settings.local_models_dir)
        self._ctx_override = settings.local_llm_ctx
        self._threads_override = settings.local_llm_threads
        self._instances: dict[str, Any] = {}

    @property
    def is_configured(self) -> bool:
        if not self._enabled:
            return False
        return any(
            (self._models_dir / c["file"]).exists() for c in iter_candidates()
        )

    def _get_instance(self, candidate: dict[str, Any]) -> Any:
        file = candidate["file"]
        if file not in self._instances:
            from llama_cpp import Llama

            path = self._models_dir / file
            self._instances[file] = Llama(
                model_path=str(path),
                n_ctx=self._ctx_override or candidate["n_ctx"],
                n_threads=self._threads_override or candidate["n_threads"],
                n_gpu_layers=0,
                verbose=False,
            )
            logger.info("local_llm_loaded", file=file, n_ctx=candidate["n_ctx"])
        return self._instances[file]

    def _generate(
        self,
        candidate: dict[str, Any],
        messages: list[dict[str, str]],
        json_schema: dict | None,
        json_mode: bool,
    ) -> str:
        llm = self._get_instance(candidate)
        kwargs: dict[str, Any] = {
            "messages": messages,
            "temperature": candidate["temperature"],
            "top_p": candidate["top_p"],
            "repeat_penalty": candidate["repeat_penalty"],
            "max_tokens": candidate["max_tokens"],
        }
        if json_schema:
            kwargs["response_format"] = {
                "type": "json_object",
                "schema": json_schema,
            }
        elif json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        response = llm.create_chat_completion(**kwargs)
        return response["choices"][0]["message"]["content"] or ""

    async def complete(
        self,
        model: str,
        messages: list[dict[str, str]],
        json_mode: bool = False,
        temperature: float = 0.2,
        json_schema: dict | None = None,
        schema_name: str = "motor_output",
    ) -> str:
        if not self._enabled:
            raise RuntimeError("SLM local desabilitado (LOCAL_LLM_ENABLED=false)")

        candidates = LOCAL_MODEL_MAP.get(model, [])
        if not candidates:
            raise RuntimeError(f"sem candidato local para o alias '{model}'")

        errors: list[str] = []
        for candidate in candidates:
            file = candidate["file"]
            if not (self._models_dir / file).exists():
                logger.info("local_llm_skip_missing", file=file)
                errors.append(f"{file}: ausente")
                continue
            try:
                return await asyncio.to_thread(
                    self._generate, candidate, messages, json_schema, json_mode
                )
            except Exception as exc:
                logger.warning(
                    "local_llm_candidate_failed", file=file, error=str(exc)
                )
                errors.append(f"{file}: {exc}")
                self._instances.pop(file, None)

        raise RuntimeError(
            "cascata local esgotada para "
            f"'{model}': {'; '.join(errors) or 'sem candidatos'}"
        )
