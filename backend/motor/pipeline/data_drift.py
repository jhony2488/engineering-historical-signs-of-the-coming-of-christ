from __future__ import annotations

import json
from datetime import date, timedelta
from typing import Any

import structlog

from motor.adapters.llm_router import LLMRouter
from motor.adapters.supabase import SupabaseClient, get_supabase
from motor.config import get_settings
from motor.domain.phases import FaseEscatologica

logger = structlog.get_logger()

PHASE_CRITERIA = {
    FaseEscatologica.FASE_I.value: "guerras, rumores, terremotos, pressões localizadas",
    FaseEscatologica.FASE_II.value: "apostasia, governança global, tecnologia de controle",
    FaseEscatologica.FASE_III.value: "manifestação coercitiva, perseguição ampla, polarização",
    FaseEscatologica.FASE_IV.value: "convergência multi-domínio, sinais cósmicos, iminência sem data",
}


class DataDriftEngine:
    """Refinamento mensal dos critérios de fase (doc: Mistral Nemo / timeline model)."""

    def __init__(self, db: SupabaseClient | None = None, router: LLMRouter | None = None) -> None:
        self.db = db or get_supabase()
        self.router = router or LLMRouter()
        self.settings = get_settings()

    def build_context(self, days: int = 30) -> dict[str, Any]:
        desde = date.today() - timedelta(days=days)
        historico = self.db.get_historico(desde=desde, limit=days)
        fases = [r.get("fase_atual") for r in historico]
        indices = [r.get("indice_global", 0) or 0 for r in historico]
        return {
            "periodo_dias": days,
            "amostras": len(historico),
            "criterios_atuais": PHASE_CRITERIA,
            "fase_mais_frequente": max(set(fases), key=fases.count) if fases else None,
            "indice_medio": sum(indices) / len(indices) if indices else 0,
            "indice_max": max(indices) if indices else 0,
            "tendencia": "ascendente"
            if len(indices) >= 2 and indices[-1] > indices[0]
            else "estavel",
        }

    async def run(self) -> dict[str, Any]:
        from motor.pipeline.prompt_compose import load_prompt

        context = self.build_context(30)
        try:
            prompt = load_prompt(
                "embeddings_curation.txt",
                contexto=json.dumps(context, ensure_ascii=False),
            )
        except Exception:
            prompt = (
                "Revise se os critérios de cada FASE escatológica ainda fazem sentido "
                "com a realidade global recente. Detecte data drift semântico. "
                "Responda JSON: criterios_revisados, drift_detectado, recomendacoes, resumo.\n\n"
                f"{json.dumps(context, ensure_ascii=False)}"
            )
        content, provider = await self.router.complete(
            self.settings.groq_model_timeline,
            [{"role": "user", "content": prompt}],
            json_mode=True,
        )
        try:
            analise = json.loads(content)
        except json.JSONDecodeError:
            analise = {
                "resumo": content,
                "drift_detectado": False,
                "criterios_revisados": PHASE_CRITERIA,
            }

        result = {
            "motor": "data_drift",
            "contexto": context,
            "analise": analise,
            "provider": provider,
        }
        self.db.insert(
            "audit_log",
            {
                "camada": "data_drift_monthly",
                "modelo": self.settings.groq_model_timeline,
                "prompt_version": "v1/data_drift",
                "input_hash": str(hash(json.dumps(context, default=str))),
                "decisao": "drift" if analise.get("drift_detectado") else "stable",
                "detalhes": result,
            },
        )
        propostas = self._persist_propostas(analise, provider)
        result["propostas_geradas"] = propostas
        logger.info(
            "data_drift_complete",
            drift=analise.get("drift_detectado"),
            propostas=propostas,
        )
        return result

    def _persist_propostas(self, analise: dict[str, Any], provider: str) -> int:
        """Recomendações da LLM viram `propostas_ajuste` pendentes — a
        aplicação exige revisão humana via endpoints admin."""
        recs = analise.get("recomendacoes") or []
        if isinstance(recs, str):
            recs = [recs]
        count = 0
        for rec in recs:
            if isinstance(rec, dict):
                proposta = {
                    "tipo": rec.get("tipo", "criterio_fase"),
                    "alvo": rec.get("alvo", "fase_criteria"),
                    "valor_atual": rec.get("valor_atual"),
                    "valor_proposto": rec.get("valor_proposto", rec),
                    "justificativa": rec.get("justificativa") or rec.get("motivo"),
                }
            else:
                proposta = {
                    "tipo": "criterio_fase",
                    "alvo": "fase_criteria",
                    "valor_atual": None,
                    "valor_proposto": {"texto": rec},
                    "justificativa": None,
                }
            try:
                self.db.insert_proposta_ajuste(
                    **proposta,
                    modelo=f"{self.settings.groq_model_timeline}@{provider}",
                    origem="data_drift_monthly",
                )
                count += 1
            except Exception as exc:
                logger.warning("proposta_ajuste_failed", error=str(exc))
        return count
