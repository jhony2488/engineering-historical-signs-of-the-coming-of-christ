from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any

import structlog

from motor.adapters.llm_router import LLMRouter
from motor.config import get_settings
from motor.schemas.validator import get_validator

logger = structlog.get_logger()
PROMPTS_DIR = Path(__file__).resolve().parents[2] / "prompts" / "v1"


def _load_prompt(name: str) -> str:
    return (PROMPTS_DIR / name).read_text(encoding="utf-8")


def _parse_json(content: str) -> dict[str, Any]:
    content = content.strip()
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\n?", "", content)
        content = re.sub(r"\n?```$", "", content)
    return json.loads(content)


class LLMPipeline:
    PROMPT_VERSION = "v1"

    def __init__(self, router: LLMRouter | None = None) -> None:
        self.router = router or LLMRouter()
        self.settings = get_settings()
        self.validator = get_validator()

    def _hash_input(self, text: str) -> str:
        return hashlib.sha256(text.encode()).hexdigest()[:16]

    async def extract_events(
        self, chunks: list[dict[str, Any]], rag: list[dict[str, str]], db
    ) -> list[dict[str, Any]]:
        results = []
        template = _load_prompt("extraction.txt")
        for chunk in chunks[:10]:
            rag_text = "\n".join(f"{r['referencia']}: {r['texto']}" for r in rag)
            prompt = template.replace("{{texto}}", chunk["texto"]).replace("{{rag}}", rag_text)
            messages = [
                {
                    "role": "system",
                    "content": (
                        "Camada 4 — extração estruturada. "
                        "Responda somente em JSON válido, sem markdown. "
                        "Não interprete profecias nem atribua datas."
                    ),
                },
                {"role": "user", "content": prompt},
            ]
            content, provider = await self.router.complete(
                self.settings.groq_model_extraction, messages, json_mode=True
            )
            try:
                parsed = _parse_json(content)
                self.validator.validate("evento_estruturado", parsed)
                parsed["fonte_id"] = chunk.get("id", "")
                row = db.insert(
                    "eventos_estruturados", {"dados": parsed, "trecho_id": chunk.get("id")}
                )
                db.log_audit(
                    "camada_4",
                    self.settings.groq_model_extraction,
                    self.PROMPT_VERSION,
                    self._hash_input(chunk["texto"]),
                    "ok",
                    {"provider": provider},
                )
                results.append({**parsed, "id": row.get("id")})
            except Exception as exc:
                db.log_audit(
                    "camada_4",
                    self.settings.groq_model_extraction,
                    self.PROMPT_VERSION,
                    self._hash_input(chunk["texto"]),
                    "error",
                    {"error": str(exc)},
                )
                logger.warning("extraction_failed", error=str(exc))
        return results

    async def build_timeline(self, events: list[dict], db) -> dict[str, Any]:
        template = _load_prompt("timeline.txt")
        prompt = template.replace("{{eventos}}", json.dumps(events, ensure_ascii=False))
        messages = [
            {
                "role": "system",
                "content": "Camada 5 — linha temporal. Responda somente em JSON válido, sem markdown.",
            },
            {"role": "user", "content": prompt},
        ]
        content, provider = await self.router.complete(
            self.settings.groq_model_timeline, messages, json_mode=True
        )
        parsed = _parse_json(content)
        row = db.insert("linhas_temporais", {"dados": parsed})
        db.log_audit(
            "camada_5",
            self.settings.groq_model_timeline,
            self.PROMPT_VERSION,
            self._hash_input(json.dumps(events)),
            "ok",
            {"provider": provider},
        )
        return {**parsed, "id": row.get("id")}

    async def reason(self, context: dict[str, Any], db) -> dict[str, Any]:
        template = _load_prompt("reasoning.txt")
        prompt = template.replace("{{dados}}", json.dumps(context, ensure_ascii=False))
        messages = [
            {
                "role": "system",
                "content": (
                    "Camada 6 — raciocínio lógico SE/ENTÃO. "
                    "Responda somente em JSON válido. Não predizer datas."
                ),
            },
            {"role": "user", "content": prompt},
        ]
        content, provider = await self.router.complete(
            self.settings.groq_model_reasoning, messages, json_mode=True
        )
        parsed = _parse_json(content)
        row = db.insert("inferencias_raciocinio", {"dados": parsed})
        db.log_audit(
            "camada_6",
            self.settings.groq_model_reasoning,
            self.PROMPT_VERSION,
            self._hash_input(json.dumps(context)),
            "ok",
            {"provider": provider},
        )
        return {**parsed, "id": row.get("id")}

    async def interpret(self, events: list[dict], rag: list[dict], db) -> dict[str, Any]:
        template = _load_prompt("hermeneutics.txt")
        rag_text = "\n".join(f"{r['referencia']}: {r['texto']}" for r in rag)
        prompt = template.replace("{{eventos}}", json.dumps(events, ensure_ascii=False)).replace(
            "{{rag}}", rag_text
        )
        messages = [
            {
                "role": "system",
                "content": (
                    "Camada 7 — hermenêutica bíblica. As Escrituras (RAG) são fonte primária. "
                    "Responda somente em JSON válido. Não datar a Parusia."
                ),
            },
            {"role": "user", "content": prompt},
        ]
        content, provider = await self.router.complete(
            self.settings.groq_model_hermeneutics, messages, json_mode=True
        )
        parsed = _parse_json(content)
        row = db.insert("interpretacoes_hermeneuticas", {"dados": parsed})
        db.log_audit(
            "camada_7",
            self.settings.groq_model_hermeneutics,
            self.PROMPT_VERSION,
            self._hash_input(json.dumps(events)),
            "ok",
            {"provider": provider},
        )
        return {**parsed, "id": row.get("id")}
