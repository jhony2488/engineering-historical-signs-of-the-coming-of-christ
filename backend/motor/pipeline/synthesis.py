from __future__ import annotations

import json
from datetime import date, timedelta
from typing import Any

import structlog

from motor.adapters.llm_router import LLMRouter
from motor.adapters.supabase import SupabaseClient
from motor.config import get_settings

logger = structlog.get_logger()


WINDOW_META: dict[str, dict[str, str | int]] = {
    "weekly": {"days": 7, "label": "Semanal (Tática)"},
    "monthly": {"days": 30, "label": "Mensal (Estratégica)"},
    "quarterly": {"days": 90, "label": "Trimestral (Ciclos)"},
    "semiannual": {"days": 180, "label": "Semestral (Ciclos)"},
    "annual": {"days": 365, "label": "Anual (Panorama)"},
}


class SynthesisEngine:
    """Motor Nível 2 — análise de deltas periódicos (semanal → anual)."""

    def __init__(self, db: SupabaseClient | None = None, router: LLMRouter | None = None) -> None:
        self.db = db or SupabaseClient()
        self.router = router or LLMRouter()
        self.settings = get_settings()

    def _window_days(self, window: str) -> int:
        meta = WINDOW_META.get(window, WINDOW_META["weekly"])
        return int(meta["days"])

    def build_delta(self, window: str = "weekly") -> dict[str, Any]:
        days = self._window_days(window)
        desde = date.today() - timedelta(days=days)
        historico = self.db.get_historico(desde=desde, limit=days)
        if not historico:
            return {"window": window, "delta": {}, "count": 0}

        first = historico[0]
        last = historico[-1]
        delta = {
            "fase_inicio": first.get("fase_atual"),
            "fase_fim": last.get("fase_atual"),
            "indice_inicio": first.get("indice_global", 0),
            "indice_fim": last.get("indice_global", 0),
            "variacao_indice": (last.get("indice_global", 0) or 0)
            - (first.get("indice_global", 0) or 0),
            "prob_inicio": first.get("probabilidade_fase", 0),
            "prob_fim": last.get("probabilidade_fase", 0),
        }
        label = str(WINDOW_META.get(window, {}).get("label", window))
        return {
            "motor": "nivel_2",
            "window": window,
            "label": label,
            "delta": delta,
            "count": len(historico),
            "periodo": {
                "inicio": first.get("data_referencia"),
                "fim": last.get("data_referencia"),
            },
        }

    async def run(self, window: str = "weekly") -> dict[str, Any]:
        snapshot = self.build_delta(window)
        prompt = (
            f"Analise a variação destes scores escatológicos e identifique padrões sistêmicos. "
            f"Responda em JSON com: padroes (lista), aceleracao_fase (bool), resumo.\n\n"
            f"{json.dumps(snapshot, ensure_ascii=False)}"
        )
        content, provider = await self.router.complete(
            self.settings.groq_model_timeline,
            [{"role": "user", "content": prompt}],
            json_mode=True,
        )
        try:
            import re

            text = content.strip()
            if text.startswith("```"):
                text = re.sub(r"^```(?:json)?\n?", "", text)
                text = re.sub(r"\n?```$", "", text)
            analise = json.loads(text)
        except Exception:
            analise = {"resumo": content, "padroes": [], "aceleracao_fase": False}

        result = {**snapshot, "analise_ia": analise, "provider": provider}
        row = {
            "janela": window,
            "data_referencia": date.today().isoformat(),
            "dados": result,
        }
        inserted = self.db.insert("snapshots_periodo", row)
        self.db.cache_snapshot(window, inserted if inserted.get("id") else row)
        return result
