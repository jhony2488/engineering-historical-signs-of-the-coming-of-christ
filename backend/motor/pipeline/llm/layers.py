from __future__ import annotations

import hashlib
import json
import re
from typing import Any

import structlog

from motor.adapters.llm_router import LLMRouter
from motor.config import get_settings
from motor.i18n.field_specs import FIELD_SPECS, REF_SPECS
from motor.i18n.translator import TranslationService
from motor.ml.event_classifier import EventShadowClassifier
from motor.pipeline.neutrality_filter import scrub_payload_narratives
from motor.prompts.loader import (
    PROMPT_VERSION,
    compose_prompt,
    get_prompt_version,
    with_system_debias,
)
from motor.schemas.validator import get_validator

logger = structlog.get_logger()

_SYSTEM_EN = {
    "extraction": (
        "Layer 4 — structured extraction. Reply only in valid JSON, "
        "no markdown. Do not interpret prophecies or assign dates."
    ),
    "timeline": "Layer 5 — timeline. Reply only in valid JSON, no markdown.",
    "reasoning": (
        "Layer 6 — IF/THEN logical-causal reasoning. Reply only in "
        "valid JSON. Do not predict dates."
    ),
    "hermeneutics": (
        "Layer 7 — historical-comparative hermeneutics. Structural "
        "analogy, not dated prophecy. Reply only in valid JSON. "
        "Do not date the Parousia."
    ),
}


class LLMPipeline:
    PROMPT_VERSION = PROMPT_VERSION

    def __init__(self, router: LLMRouter | None = None, embeddings: Any | None = None) -> None:
        self.router = router or LLMRouter()
        self.settings = get_settings()
        self.validator = get_validator()
        self.shadow = EventShadowClassifier(embeddings)
        self.translator = TranslationService()
        self._embeddings = embeddings
        self._local_extractor = None
        self.PROMPT_VERSION = get_prompt_version()

    def _system(self, key: str, pt: str) -> str:
        if self.settings.prompts_lang == "en":
            return with_system_debias(_SYSTEM_EN.get(key, pt))
        return with_system_debias(pt)

    def _translate_narratives(self, obj: dict[str, Any], artifact: str) -> dict[str, Any]:
        """translate_narratives: EN→PT (NLLB) nos campos narrativos + refs EN→PT."""
        if not self.settings.translate_narratives:
            return obj
        try:
            self.translator.translate_fields(obj, FIELD_SPECS.get(artifact, []))
            self.translator.map_ref_fields(obj, REF_SPECS.get(artifact, []))
        except Exception as exc:
            logger.warning("translate_narratives_failed", artifact=artifact, error=str(exc))
        return obj

    def _rag_for_chunk(self, chunk: dict[str, Any], fallback: list[dict[str, str]]):
        """RAG por chunk (mais preciso que o compartilhado) com fallback."""
        if not self._embeddings:
            return fallback
        try:
            items = self._embeddings.rag_teologico(chunk.get("texto", "")[:400], top_k=3)
            return items or fallback
        except Exception as exc:
            logger.warning("rag_per_chunk_failed", error=str(exc))
            return fallback

    def _fill_from_classifier(self, parsed: dict[str, Any], shadow: dict[str, Any]) -> list[str]:
        """classifier_hints_enabled: preenche/corrige categóricos inválidos
        (evento/energia/dimensao) com o classificador local, antes do validate."""
        if not self.settings.classifier_hints_enabled or not shadow:
            return []
        props = self.validator.get_schema("evento_estruturado").get("properties", {})
        filled = []
        for field in ("energia", "dimensao", "evento"):
            allowed = props.get(field, {}).get("enum")
            val = parsed.get(field)
            if not allowed or (val in allowed):
                continue
            hint = (shadow.get(field) or {}).get("valor")
            if hint and hint in allowed:
                parsed[field] = hint
                filled.append(field)
        return filled

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
            rag_items = self._rag_for_chunk(chunk, rag)
            rag_text = "\n".join(f"{r['referencia']}: {r['texto']}" for r in rag_items)
            prompt = template.replace("{{texto}}", chunk["texto"]).replace("{{rag}}", rag_text)
            messages = [
                {
                    "role": "system",
                    "content": self._system(
                        "extraction",
                        "Camada 4 — extração estruturada. "
                        "Responda somente em JSON válido, sem markdown. "
                        "Não interprete profecias nem atribua datas.",
                    ),
                },
                {"role": "user", "content": prompt},
            ]
            parsed: dict[str, Any] | None = self._local_extract(chunk.get("texto", ""))
            provider = "local_classifier"
            model_name = "local_event_extractor_v1"
            shadow: dict[str, Any] | None = None

            def get_shadow(text: str = chunk.get("texto", "")) -> dict[str, Any]:
                nonlocal shadow
                if shadow is None:
                    try:
                        shadow = self.shadow.classify(text)
                    except Exception as exc:
                        logger.warning("classifier_hints_failed", error=str(exc))
                        shadow = {}
                return shadow

            if parsed is None:
                model_name = (
                    self.settings.gemini_model_extraction
                    if self.settings.gemini_api_key
                    else self.settings.groq_model_extraction
                )
                last_err: str | None = None
                for _ in range(2):
                    try:
                        msgs = messages
                        if last_err:
                            msgs = [
                                *messages,
                                {
                                    "role": "user",
                                    "content": (
                                        f"ERROR: previous output was invalid ({last_err}). "
                                        "Reply ONLY with valid JSON matching the schema."
                                    ),
                                },
                            ]
                        content, provider = await self.router.complete(
                            model_name,
                            msgs,
                            json_mode=True,
                            json_schema=self.validator.get_schema("evento_estruturado"),
                            schema_name="evento_estruturado",
                        )
                        parsed = self._parse_json(content)
                        filled = self._fill_from_classifier(parsed, get_shadow())
                        self.validator.validate("evento_estruturado", parsed)
                        if filled:
                            logger.info("classifier_hints_applied", fields=filled)
                        break
                    except Exception as exc:
                        last_err = str(exc)
                        parsed = None
                if parsed is None:
                    db.log_audit(
                        "camada_4",
                        model_name,
                        self.PROMPT_VERSION,
                        self._hash_input(chunk["texto"]),
                        "error",
                        {"error": last_err},
                    )
                    logger.warning("extraction_failed", error=last_err)
                    continue
            try:
                self.validator.validate("evento_estruturado", parsed)
                parsed = self._translate_narratives(parsed, "evento")
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
                "content": self._system(
                    "timeline",
                    "Camada 5 — linha temporal. Responda somente em JSON válido, sem markdown.",
                ),
            },
            {"role": "user", "content": prompt},
        ]
        model_name = (
            self.settings.gemini_model_timeline
            if self.settings.gemini_api_key
            else self.settings.groq_model_timeline
        )
        content, provider = await self.router.complete(model_name, messages, json_mode=True)
        parsed = self._translate_narratives(self._parse_json(content), "timeline")
        row = db.insert("linhas_temporais", {"dados": parsed})
        db.log_audit(
            "camada_5",
            model_name,
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
                "content": self._system(
                    "reasoning",
                    "Camada 6 — raciocínio lógico-causal SE/ENTÃO. "
                    "Responda somente em JSON válido. Não predizer datas.",
                ),
            },
            {"role": "user", "content": prompt},
        ]
        model_name = (
            self.settings.deepseek_model_reasoning
            if self.settings.deepseek_api_key
            else self.settings.groq_model_reasoning
        )
        content, provider = await self.router.complete(model_name, messages, json_mode=True)
        parsed = self._translate_narratives(
            scrub_payload_narratives(
                self._parse_json(content),
                keys=("raciocinio", "disclaimer", "justificativa"),
                layer="camada_6",
            ),
            "reasoning",
        )
        row = db.insert("inferencias_raciocinio", {"dados": parsed})
        db.log_audit(
            "camada_6",
            model_name,
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
                "content": self._system(
                    "hermeneutics",
                    "Camada 7 — hermenêutica histórico-comparativa. "
                    "Analogia estrutural, não profecia datada. "
                    "Responda somente em JSON válido. Não datar a Parusia.",
                ),
            },
            {"role": "user", "content": prompt},
        ]
        model_name = (
            self.settings.gemini_model_hermeneutics
            if self.settings.gemini_api_key
            else self.settings.groq_model_hermeneutics
        )
        content, provider = await self.router.complete(model_name, messages, json_mode=True)
        parsed = self._translate_narratives(
            scrub_payload_narratives(
                self._parse_json(content),
                keys=("similaridades", "divergencias", "citacoes", "adherence_caution"),
                list_keys=("similaridades", "divergencias", "citacoes"),
                layer="camada_7",
            ),
            "hermeneutics",
        )
        row = db.insert("interpretacoes_hermeneuticas", {"dados": parsed})
        db.log_audit(
            "camada_7",
            model_name,
            self.PROMPT_VERSION,
            self._hash_input(json.dumps(events)),
            "ok",
            {"provider": provider},
        )
        return {**parsed, "id": row.get("id")}
