from __future__ import annotations

import re
import uuid
from datetime import UTC, date, datetime
from typing import Any

import structlog

from motor.adapters.supabase import SupabaseClient, get_supabase
from motor.domain.apocalyptic_signals import PROPHECY_SIGNAL_KEYWORDS
from motor.pipeline.historical_baseline import (
    BASELINE_ID,
    HistoricalBaselineService,
    clear_baseline_cache,
)

logger = structlog.get_logger()

MATCH_THRESHOLD = 0.45
PARTIAL_THRESHOLD = 0.3

# Re-export para testes e documentação
SIGNAL_KEYWORDS = PROPHECY_SIGNAL_KEYWORDS


def _tokenize(text: str) -> set[str]:
    return {w for w in re.findall(r"\w{3,}", text.lower()) if len(w) >= 3}


def _score_match(profecia_id: str, titulo: str, corpus: str) -> float:
    title_tokens = _tokenize(titulo)
    corpus_tokens = _tokenize(corpus)
    if not title_tokens or not corpus_tokens:
        return 0.0

    overlap = len(title_tokens & corpus_tokens) / len(title_tokens)
    keywords = SIGNAL_KEYWORDS.get(profecia_id, [])
    if keywords:
        kw_hits = sum(1 for kw in keywords if kw in corpus.lower())
        overlap += (kw_hits / max(len(keywords), 1)) * 0.35

    return min(1.0, overlap)


def _build_corpus(
    events: list[dict[str, Any]],
    interpretation: dict[str, Any] | None,
    fase: str,
) -> str:
    parts: list[str] = [fase]
    for ev in events:
        parts.append(str(ev.get("evento", "")))
        parts.append(str(ev.get("descricao", "")))
        parts.append(str(ev.get("regiao", "")))

    if interpretation:
        parts.extend(str(x) for x in interpretation.get("similaridades", []) or [])
        parts.extend(str(x) for x in interpretation.get("divergencias", []) or [])
        parts.extend(str(x) for x in interpretation.get("citacoes", []) or [])

    return " ".join(parts)


class FulfillmentTracker:
    """Detecta profecias pendentes que avançam para cumprida/parcial no run diário."""

    def __init__(self, db: SupabaseClient | None = None) -> None:
        self.db = db or get_supabase()
        self.baseline_svc = HistoricalBaselineService(self.db)

    def _pending_rows(self) -> list[dict[str, Any]]:
        return self.db.select("arquivo_profetico", filters={"status": "pendente"}, limit=500)

    def _append_update(self, update: dict[str, Any]) -> None:
        rows = self.db.select("baseline_escatologico", filters={"id": BASELINE_ID}, limit=1)
        if not rows:
            return

        atualizacoes = list(rows[0].get("atualizacoes") or [])
        if any(u.get("profecia_id") == update["profecia_id"] for u in atualizacoes):
            return

        atualizacoes.insert(0, update)
        atualizacoes = atualizacoes[:100]

        self.db.upsert(
            "baseline_escatologico",
            {
                "id": BASELINE_ID,
                "atualizacoes": atualizacoes,
                "updated_at": datetime.now(UTC).isoformat(),
            },
            on_conflict="id",
        )

    def _refresh_stats(self, novo_status: str) -> None:
        rows = self.db.select("baseline_escatologico", filters={"id": BASELINE_ID}, limit=1)
        if not rows:
            return

        stats = dict(rows[0].get("estatisticas") or {})
        if novo_status == "cumprida":
            stats["profecias_cumpridas"] = int(stats.get("profecias_cumpridas", 1797)) + 1
            stats["profecias_pendentes"] = max(0, int(stats.get("profecias_pendentes", 22)) - 1)
            stats["eventos_cumpridos"] = int(stats.get("eventos_cumpridos", 580)) + 1
            stats["eventos_pendentes"] = max(0, int(stats.get("eventos_pendentes", 20)) - 1)
        elif novo_status == "parcial":
            stats["eventos_cumpridos"] = int(stats.get("eventos_cumpridos", 580)) + 0

        total = int(stats.get("total_profecias_biblicas", 1819))
        cumpridas = int(stats.get("profecias_cumpridas", 1797))
        eventos_total = int(stats.get("eventos_principais_mapeados", 600))
        eventos_cumpridos = int(stats.get("eventos_cumpridos", 580))
        stats["taxa_cumprimento_profecias"] = round(cumpridas / total, 3) if total else 0
        stats["taxa_cumprimento_eventos"] = (
            round(eventos_cumpridos / eventos_total, 3) if eventos_total else 0
        )

        self.db.upsert(
            "baseline_escatologico",
            {
                "id": BASELINE_ID,
                "estatisticas": stats,
                "updated_at": datetime.now(UTC).isoformat(),
            },
            on_conflict="id",
        )

    def detect_and_record(
        self,
        ref_date: date,
        events: list[dict[str, Any]],
        interpretation: dict[str, Any] | None,
        fase: str,
        confianca: float,
    ) -> list[dict[str, Any]]:
        if confianca < 0.55:
            return []

        corpus = _build_corpus(events, interpretation, fase)
        pending = self._pending_rows()
        recorded: list[dict[str, Any]] = []

        for row in pending:
            profecia_id = str(row.get("id", ""))
            titulo = str(row.get("titulo", ""))
            score = _score_match(profecia_id, titulo, corpus)
            fase_alvo = (row.get("dados") or {}).get("fase_alvo") or row.get("fase_escatologica")
            if fase_alvo and fase_alvo == fase:
                score += 0.1

            if score < PARTIAL_THRESHOLD:
                continue

            novo_status = "cumprida" if score >= MATCH_THRESHOLD else "parcial"
            if novo_status == "parcial" and row.get("status") == "parcial":
                continue

            self.db.upsert(
                "arquivo_profetico",
                {
                    "id": profecia_id,
                    "titulo": titulo,
                    "status": novo_status,
                    "categoria": row.get("categoria", "pendente_escatologico"),
                    "referencias": row.get("referencias", []),
                    "periodo_cumprimento": ref_date.isoformat(),
                    "fase_escatologica": fase_alvo,
                    "descricao": row.get("descricao", ""),
                    "dados": {
                        **(row.get("dados") or {}),
                        "detectado_em": ref_date.isoformat(),
                        "score_match": round(score, 3),
                        "origem": "run_diario",
                    },
                    "cumprida_em": ref_date.isoformat(),
                    "updated_at": datetime.now(UTC).isoformat(),
                },
                on_conflict="id",
            )

            update = {
                "id": f"upd_{uuid.uuid4().hex[:12]}",
                "profecia_id": profecia_id,
                "titulo": titulo,
                "status_anterior": "pendente",
                "status_novo": novo_status,
                "data_deteccao": ref_date.isoformat(),
                "confianca": round(confianca, 3),
                "score_match": round(score, 3),
                "fase": fase,
                "evidencia": corpus[:280],
            }
            self._append_update(update)
            if novo_status == "cumprida":
                self._refresh_stats(novo_status)
            recorded.append(update)
            logger.info(
                "profecia_fulfillment_detected",
                profecia_id=profecia_id,
                status=novo_status,
                score=round(score, 3),
            )

        if recorded:
            clear_baseline_cache()

        return recorded

    def get_atualizacoes(self, limit: int = 20) -> list[dict[str, Any]]:
        rows = self.db.select("baseline_escatologico", filters={"id": BASELINE_ID}, limit=1)
        if not rows:
            return []
        return list(rows[0].get("atualizacoes") or [])[:limit]
