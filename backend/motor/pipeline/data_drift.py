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
        context = self.build_context(30)
        prompt = (
            "Revise se os critérios de cada FASE escatológica ainda fazem sentido com a realidade global recente. "
            "Detecte data drift semântico. Responda JSON: "
            "criterios_revisados (objeto FASE_I..IV), drift_detectado (bool), "
            "recomendacoes (lista), resumo.\n\n"
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
        logger.info("data_drift_complete", drift=analise.get("drift_detectado"))
        return result
