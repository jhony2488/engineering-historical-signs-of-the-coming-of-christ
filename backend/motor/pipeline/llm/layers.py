from __future__ import annotations

import hashlib
import json
import re
from typing import Any

import structlog

from motor.adapters.llm_router import LLMRouter
from motor.config import get_settings
from motor.ml.event_classifier import EventShadowClassifier
from motor.pipeline.neutrality_filter import scrub_payload_narratives
from motor.prompts.loader import PROMPT_VERSION, compose_prompt, with_system_debias
from motor.schemas.validator import get_validator

logger = structlog.get_logger()


class LLMPipeline:
    PROMPT_VERSION = PROMPT_VERSION

    def __init__(
        self, router: LLMRouter | None = None, embeddings: Any | None = None
    ) -> None:
        self.router = router or LLMRouter()
        self.settings = get_settings()
        self.validator = get_validator()
        self.shadow = EventShadowClassifier(embeddings)
        self._embeddings = embeddings
        self._local_extractor = None

    def _local_extract(self, text: str) -> dict[str, Any] | None:
        """extraction_mode=classifier_first: destilado sklearn; LLM só em baixa confiança."""
        if self.settings.extraction_mode != "classifier_first":
            return None
        if self._local_extractor is None:
            from motor.ml.distill import LocalEventExtractor

            self._local_extractor = LocalEventExtractor(self._embeddings)
        out = self._local_extractor.extract(text)
        if out and out.get("confianca_extracao", 0.0) >= self.settings.classifier_confidence_min:
            return out
        return None

    def _shadow_audit(
        self, chunk: dict[str, Any], parsed: dict[str, Any], db, model_name: str
    ) -> None:
        """Shadow mode: classificador local vs saída da extração — só registra divergências."""
        if not self.settings.event_shadow_enabled:
            return
        try:
            shadow = self.shadow.classify(chunk["texto"])
            db.log_audit(
                "camada_4_shadow",
                "event_shadow_classifier_v1",
                self.PROMPT_VERSION,
                self._hash_input(chunk["texto"]),
                "ok",
                {
                    "modelo_extracao": model_name,
                    "extracao": {
                        "evento": parsed.get("evento"),
                        "energia": parsed.get("energia"),
                        "dimensao": parsed.get("dimensao"),
                    },
                    "topicos_keyword": chunk.get("topicos"),
                    "shadow": shadow,
                    "agree": {
                        "energia": shadow["energia"]["valor"] == parsed.get("energia"),
                        "dimensao": shadow["dimensao"]["valor"] == parsed.get("dimensao"),
                        "evento": shadow["evento"]["valor"] == parsed.get("evento"),
                    },
                },
            )
        except Exception as exc:
            logger.warning("shadow_classifier_failed", error=str(exc))

    def _hash_input(self, text: str) -> str:
        return hashlib.sha256(text.encode()).hexdigest()[:16]

    def _parse_json(self, content: str) -> dict[str, Any]:
        content = content.strip()
        if content.startswith("```"):
            content = re.sub(r"^```(?:json)?\n?", "", content)
            content = re.sub(r"\n?```$", "", content)
        return json.loads(content)

    async def extract_events(
        self, chunks: list[dict[str, Any]], rag: list[dict[str, str]], db
    ) -> list[dict[str, Any]]:
        results = []
        template = compose_prompt("extraction.txt")
        for chunk in chunks[: self.settings.extraction_top_k]:
            rag_text = "\n".join(f"{r['referencia']}: {r['texto']}" for r in rag)
            prompt = template.replace("{{texto}}", chunk["texto"]).replace("{{rag}}", rag_text)
            messages = [
                {
                    "role": "system",
                    "content": with_system_debias(
                        "Camada 4 — extração estruturada. "
                        "Responda somente em JSON válido, sem markdown. "
                        "Não interprete profecias nem atribua datas."
                    ),
                },
                {"role": "user", "content": prompt},
            ]
            parsed: dict[str, Any] | None = self._local_extract(chunk.get("texto", ""))
            provider = "local_classifier"
            model_name = "local_event_extractor_v1"
            if parsed is None:
                content, provider = await self.router.complete(
                    self.settings.groq_model_extraction, messages, json_mode=True
                )
                model_name = self.settings.groq_model_extraction
            try:
                if parsed is None:
                    parsed = self._parse_json(content)
                self.validator.validate("evento_estruturado", parsed)
                parsed["fonte_id"] = chunk.get("id", "")
                row = db.insert(
                    "eventos_estruturados", {"dados": parsed, "trecho_id": chunk.get("id")}
                )
                self._shadow_audit(chunk, parsed, db, model_name)
                db.log_audit(
                    "camada_4",
                    model_name,
                    self.PROMPT_VERSION,
                    self._hash_input(chunk["texto"]),
                    "ok",
                    {"provider": provider},
                )
                results.append({**parsed, "id": row.get("id")})
            except Exception as exc:
                db.log_audit(
                    "camada_4",
                    model_name,
                    self.PROMPT_VERSION,
                    self._hash_input(chunk["texto"]),
                    "error",
                    {"error": str(exc)},
                )
                logger.warning("extraction_failed", error=str(exc))
        return results

    async def build_timeline(self, events: list[dict], db) -> dict[str, Any]:
        template = compose_prompt("timeline.txt")
        prompt = template.replace("{{eventos}}", json.dumps(events, ensure_ascii=False))
        messages = [
            {
                "role": "system",
                "content": with_system_debias(
                    "Camada 5 — linha temporal. Responda somente em JSON válido, sem markdown."
                ),
            },
            {"role": "user", "content": prompt},
        ]
        content, provider = await self.router.complete(
            self.settings.groq_model_timeline, messages, json_mode=True
        )
        parsed = self._parse_json(content)
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
        template = compose_prompt("reasoning.txt")
        prompt = template.replace("{{dados}}", json.dumps(context, ensure_ascii=False))
        messages = [
            {
                "role": "system",
                "content": with_system_debias(
                    "Camada 6 — raciocínio lógico-causal SE/ENTÃO. "
                    "Responda somente em JSON válido. Não predizer datas."
                ),
            },
            {"role": "user", "content": prompt},
        ]
        content, provider = await self.router.complete(
            self.settings.groq_model_reasoning, messages, json_mode=True
        )
        parsed = scrub_payload_narratives(
            self._parse_json(content),
            keys=("raciocinio", "disclaimer", "justificativa"),
            layer="camada_6",
        )
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
        template = compose_prompt("hermeneutics.txt")
        rag_text = "\n".join(f"{r['referencia']}: {r['texto']}" for r in rag)
        prompt = template.replace("{{eventos}}", json.dumps(events, ensure_ascii=False)).replace(
            "{{rag}}", rag_text
        )
        messages = [
            {
                "role": "system",
                "content": with_system_debias(
                    "Camada 7 — hermenêutica histórico-comparativa. "
                    "Analogia estrutural, não profecia datada. "
                    "Responda somente em JSON válido. Não datar a Parusia."
                ),
            },
            {"role": "user", "content": prompt},
        ]
        content, provider = await self.router.complete(
            self.settings.groq_model_hermeneutics, messages, json_mode=True
        )
        parsed = scrub_payload_narratives(
            self._parse_json(content),
            keys=("similaridades", "divergencias", "citacoes", "adherence_caution"),
            list_keys=("similaridades", "divergencias", "citacoes"),
            layer="camada_7",
        )
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
