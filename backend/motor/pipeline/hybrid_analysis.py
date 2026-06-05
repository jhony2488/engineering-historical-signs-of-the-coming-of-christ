from __future__ import annotations

import json
import re
from datetime import date, timedelta
from pathlib import Path
from typing import Any

import structlog

from motor.adapters.llm_router import LLMRouter
from motor.adapters.supabase import SupabaseClient
from motor.config import get_settings
from motor.pipeline.embeddings.service import EmbeddingService

logger = structlog.get_logger()

PROMPT_PATH = Path(__file__).resolve().parents[1] / "prompts" / "v1" / "hybrid_analysis.txt"

WINDOW_CONFIG: dict[str, dict[str, Any]] = {
    "quarterly": {
        "days": 90,
        "sub_windows": ["weekly", "monthly"],
        "janela_out": "quarterly_hybrid",
        "label": "Trimestral (Ciclos)",
    },
    "semiannual": {
        "days": 180,
        "sub_windows": ["weekly", "monthly", "quarterly"],
        "janela_out": "semiannual_hybrid",
        "label": "Semestral (Ciclos)",
    },
    "annual": {
        "days": 365,
        "sub_windows": ["weekly", "monthly", "quarterly", "annual"],
        "janela_out": "annual_hybrid",
        "label": "Anual (Panorama)",
    },
}


class HybridAnalysisEngine:
    """Motor Nível 3 — análise híbrida multi-janela + RAG teológico (Camada 3)."""

    def __init__(
        self,
        db: SupabaseClient | None = None,
        router: LLMRouter | None = None,
        embeddings: EmbeddingService | None = None,
    ) -> None:
        self.db = db or SupabaseClient()
        self.router = router or LLMRouter()
        self.embeddings = embeddings or EmbeddingService()
        self.settings = get_settings()

    def _load_prompt(self) -> str:
        return PROMPT_PATH.read_text(encoding="utf-8")

    def _parse_json(self, content: str) -> dict[str, Any]:
        text = content.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\n?", "", text)
            text = re.sub(r"\n?```$", "", text)
        try:
            return json.loads(text)
        except Exception:
            return {"panorama": content, "padroes_cruzados": [], "aceleracao_transicao": False}

    def _aggregate_historico(self, days: int) -> dict[str, Any]:
        desde = date.today() - timedelta(days=days)
        historico = self.db.get_historico(desde=desde, limit=days)
        if not historico:
            return {"count": 0, "resumo": {}}

        indices = [r.get("indice_global", 0) or 0 for r in historico]
        fases = [r.get("fase_atual") for r in historico]
        probs = [r.get("probabilidade_fase", 0) or 0 for r in historico]
        return {
            "count": len(historico),
            "resumo": {
                "indice_medio": sum(indices) / len(indices),
                "indice_min": min(indices),
                "indice_max": max(indices),
                "prob_media": sum(probs) / len(probs),
                "fase_mais_frequente": max(set(fases), key=fases.count) if fases else None,
                "fase_inicio": fases[0],
                "fase_fim": fases[-1],
            },
            "periodo": {
                "inicio": historico[0].get("data_referencia"),
                "fim": historico[-1].get("data_referencia"),
            },
        }

    def _collect_nivel2_snapshots(self, sub_windows: list[str]) -> dict[str, Any]:
        collected: dict[str, Any] = {}
        for janela in sub_windows:
            row = self.db.get_latest_snapshot(janela)
            if row:
                collected[janela] = row.get("dados", row)
            else:
                collected[janela] = None
        return collected

    def _rag_context(self, historico_resumo: dict[str, Any]) -> list[dict[str, str]]:
        fase = (
            historico_resumo.get("fase_fim")
            or historico_resumo.get("fase_mais_frequente")
            or "FASE_II"
        )
        query = (
            f"Transição escatológica fase {fase} sinais históricos convergência "
            "apostasia tribulação parusia oriente médio"
        )
        return self.embeddings.rag_teologico(query, top_k=4)

    def build_payload(self, window: str = "annual") -> dict[str, Any]:
        cfg = WINDOW_CONFIG.get(window, WINDOW_CONFIG["annual"])
        historico_agg = self._aggregate_historico(cfg["days"])
        resumo = historico_agg.get("resumo", {})
        snapshots = self._collect_nivel2_snapshots(cfg["sub_windows"])
        rag = self._rag_context(resumo)

        return {
            "motor": "nivel_3",
            "window": window,
            "janela_out": cfg["janela_out"],
            "label": cfg["label"],
            "snapshots_nivel2": snapshots,
            "historico_agregado": historico_agg,
            "rag_teologico": rag,
            "sub_windows_esperadas": cfg["sub_windows"],
        }

    async def run(self, window: str = "annual") -> dict[str, Any]:
        payload = self.build_payload(window)
        system_prompt = self._load_prompt()
        user_prompt = (
            f"Janela de panorama: {payload['label']} ({window}).\n\n"
            f"Dados híbridos:\n{json.dumps(payload, ensure_ascii=False, default=str)}"
        )

        reasoning_content, reasoning_provider = await self.router.complete(
            self.settings.groq_model_reasoning,
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            json_mode=True,
        )
        reasoning = self._parse_json(reasoning_content)

        hermeneutics_content, herm_provider = await self.router.complete(
            self.settings.groq_model_hermeneutics,
            [
                {
                    "role": "system",
                    "content": (
                        "Refine a análise híbrida Nível 3 com hermenêutica bíblica. "
                        "Preserve todos os campos do raciocínio híbrido e acrescente "
                        "aderencia_profetica (0-1). As Escrituras ancoram a síntese; "
                        "não predizer datas. Responda somente em JSON válido."
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        {"raciocinio": reasoning, "rag": payload["rag_teologico"]},
                        ensure_ascii=False,
                    ),
                },
            ],
            json_mode=True,
        )
        hermeneutica = self._parse_json(hermeneutics_content)

        result = {
            **payload,
            "analise_hibrida": {
                "raciocinio": reasoning,
                "hermeneutica": hermeneutica,
                "panorama": hermeneutica.get("panorama") or reasoning.get("panorama", ""),
            },
            "providers": {
                "reasoning": reasoning_provider,
                "hermeneutics": herm_provider,
            },
        }

        row = {
            "janela": payload["janela_out"],
            "data_referencia": date.today().isoformat(),
            "dados": result,
        }
        inserted = self.db.insert("snapshots_periodo", row)
        self.db.cache_snapshot(payload["janela_out"], inserted if inserted.get("id") else row)
        self.db.log_audit(
            camada="nivel_3_hybrid",
            modelo=f"{self.settings.groq_model_reasoning}+{self.settings.groq_model_hermeneutics}",
            prompt_version="v1/hybrid_analysis",
            input_hash=str(hash(json.dumps(payload, default=str))),
            decisao=payload["janela_out"],
            detalhes={"window": window, "sub_windows": payload["sub_windows_esperadas"]},
        )
        logger.info("hybrid_analysis_complete", window=window, janela=payload["janela_out"])
        return result
