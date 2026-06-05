from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

import structlog

from motor.adapters.supabase import SupabaseClient, get_supabase
from motor.config import CONFIG_DIR
from motor.ml.graph import PropheticGraph

logger = structlog.get_logger()

BASELINE_ID = "global"
_CACHE: dict[str, Any] | None = None


def clear_baseline_cache() -> None:
    global _CACHE
    _CACHE = None


class HistoricalBaselineService:
    """Camada 0 — overview de profecias cumpridas antes do monitoramento diário."""

    def __init__(self, db: SupabaseClient | None = None) -> None:
        self.db = db or get_supabase()

    def _load_seed(self) -> dict[str, Any]:
        path = CONFIG_DIR / "profecias_baseline_seed.json"
        with path.open(encoding="utf-8") as f:
            return json.load(f)

    def _marco_zero_deslocamento(self, stats: dict[str, Any]) -> float:
        """Distancia do baseline historico ao padrao de convergencia final (0-1)."""
        taxa = float(stats.get("taxa_cumprimento_eventos", 0.97))
        return round(max(0.0, min(1.0, 1.0 - taxa)), 4)

    def _event_status(self, evento: dict[str, Any]) -> str:
        return str(evento.get("status", "cumprida"))

    def _persist_arquivo(self, seed: dict[str, Any]) -> int:
        count = 0
        for ev in seed.get("eventos_cumpridos", []):
            row = {
                "id": ev["id"],
                "titulo": ev["titulo"],
                "status": self._event_status(ev),
                "categoria": ev.get("categoria", "geral"),
                "referencias": ev.get("referencias", []),
                "periodo_cumprimento": ev.get("periodo_cumprimento"),
                "fase_escatologica": ev.get("fase_escatologica"),
                "energia": ev.get("energia", "misto"),
                "dimensao": ev.get("dimensao", "macro"),
                "descricao": ev.get("descricao", ""),
                "dados": {"tipo": "evento_cumprido"},
            }
            self.db.upsert("arquivo_profetico", row, on_conflict="id")
            count += 1

        for ev in seed.get("profecias_pendentes", []):
            row = {
                "id": ev["id"],
                "titulo": ev["titulo"],
                "status": "pendente",
                "categoria": "pendente_escatologico",
                "referencias": ev.get("referencias", []),
                "periodo_cumprimento": None,
                "fase_escatologica": ev.get("fase_alvo"),
                "energia": "contracao",
                "dimensao": "macro",
                "descricao": ev.get("nota", ""),
                "dados": {"tipo": "profecia_pendente"},
            }
            self.db.upsert("arquivo_profetico", row, on_conflict="id")
            count += 1

        for sinal in seed.get("sinais_gerais_ja_ocorridos", []):
            row = {
                "id": sinal["id"],
                "titulo": sinal["titulo"],
                "status": sinal.get("status", "cumprida"),
                "categoria": "sinal_geral_historico",
                "referencias": [],
                "periodo_cumprimento": sinal.get("periodo"),
                "fase_escatologica": sinal.get("fase"),
                "energia": sinal.get("energia", "misto"),
                "dimensao": sinal.get("dimensao", "macro"),
                "descricao": sinal.get("titulo"),
                "dados": {"tipo": "sinal_geral"},
            }
            self.db.upsert("arquivo_profetico", row, on_conflict="id")
            count += 1

        return count

    def _persist_structured_events(self, seed: dict[str, Any]) -> None:
        for ev in seed.get("eventos_cumpridos", []):
            payload = {
                "evento": ev["id"],
                "regiao": "historico",
                "grau_tensao": 0.35,
                "impacto_global": 0.85,
                "energia": ev.get("energia", "misto"),
                "dimensao": ev.get("dimensao", "macro"),
                "historico": True,
                "titulo": ev["titulo"],
                "referencias": ev.get("referencias", []),
                "periodo_cumprimento": ev.get("periodo_cumprimento"),
            }
            self.db.insert(
                "eventos_estruturados",
                {"trecho_id": f"baseline-{ev['id']}", "dados": payload},
            )

        for sinal in seed.get("sinais_gerais_ja_ocorridos", []):
            payload = {
                "evento": sinal["id"],
                "regiao": "global",
                "grau_tensao": 0.55,
                "impacto_global": 0.6,
                "energia": sinal.get("energia", "contracao"),
                "dimensao": sinal.get("dimensao", "macro"),
                "historico": True,
                "titulo": sinal["titulo"],
                "periodo": sinal.get("periodo"),
            }
            self.db.insert(
                "eventos_estruturados",
                {"trecho_id": f"baseline-{sinal['id']}", "dados": payload},
            )

    def _persist_timeline(self, overview: dict[str, Any], stats: dict[str, Any]) -> None:
        self.db.insert(
            "linhas_temporais",
            {
                "dados": {
                    "tipo": "baseline_historico",
                    "titulo": overview.get("titulo"),
                    "resumo": overview.get("resumo"),
                    "marco_zero": overview.get("marco_zero"),
                    "estatisticas": stats,
                    "marco_zero_deslocamento": self._marco_zero_deslocamento(stats),
                },
            },
        )

    def _persist_graph(self, seed: dict[str, Any]) -> None:
        graph = PropheticGraph()
        graph.seed_default()

        for ev in seed.get("eventos_cumpridos", []):
            graph.add_node(
                ev["id"],
                "profecia",
                {
                    "titulo": ev["titulo"],
                    "status": self._event_status(ev),
                    "cumprida": True,
                    "ref": ", ".join(ev.get("referencias", [])[:2]),
                },
            )

        for ev in seed.get("profecias_pendentes", []):
            graph.add_node(
                ev["id"],
                "profecia",
                {
                    "titulo": ev["titulo"],
                    "status": "pendente",
                    "cumprida": False,
                    "fase_alvo": ev.get("fase_alvo"),
                },
            )

        nodes, edges = graph.to_records()
        for n in nodes:
            self.db.upsert(
                "grafo_nos",
                {"node_id": n["id"], "tipo": n.get("tipo"), "attrs": n},
                on_conflict="node_id",
            )
        for e in edges:
            self.db.insert(
                "grafo_arestas",
                {
                    "source_id": e["source"],
                    "target_id": e["target"],
                    "relacao": e.get("relacao", "influencia"),
                },
            )

    def _persist_corpus_refs(self, seed: dict[str, Any]) -> None:
        seen: set[str] = set()
        for ev in seed.get("eventos_cumpridos", []):
            for ref in ev.get("referencias", []):
                if ref in seen:
                    continue
                seen.add(ref)
                self.db.upsert(
                    "corpus_teologico",
                    {
                        "referencia": ref,
                        "texto": f"[baseline] {ev['titulo']}",
                        "tema": ev.get("categoria", "baseline"),
                    },
                    on_conflict="referencia",
                )

    def _build_overview_payload(self, seed: dict[str, Any]) -> dict[str, Any]:
        stats = seed["estatisticas"]
        overview = seed["overview"]
        marco = self._marco_zero_deslocamento(stats)
        return {
            "schema_version": seed.get("schema_version", "1.0.0"),
            "versao": seed.get("versao"),
            "fonte": seed.get("fonte"),
            "estatisticas": stats,
            "overview": overview,
            "categorias": seed.get("categorias", []),
            "profecias_pendentes": seed.get("profecias_pendentes", []),
            "sinais_gerais": seed.get("sinais_gerais_ja_ocorridos", []),
            "marco_zero_deslocamento": marco,
            "eventos_cumpridos_amostra": len(seed.get("eventos_cumpridos", [])),
            "inicializado_em": datetime.now(UTC).isoformat(),
        }

    def is_initialized(self) -> bool:
        global _CACHE
        if _CACHE is not None:
            return True
        rows = self.db.select("baseline_escatologico", filters={"id": BASELINE_ID}, limit=1)
        return len(rows) > 0

    def get_overview(self) -> dict[str, Any] | None:
        global _CACHE
        if _CACHE is not None:
            return _CACHE
        rows = self.db.select("baseline_escatologico", filters={"id": BASELINE_ID}, limit=1)
        if not rows:
            return None
        row = rows[0]
        return {
            "estatisticas": row.get("estatisticas", {}),
            "overview": row.get("overview", {}),
            "categorias": row.get("categorias", []),
            "profecias_pendentes": row.get("profecias_pendentes", []),
            "sinais_gerais": row.get("sinais_gerais", []),
            "atualizacoes": row.get("atualizacoes", []),
            "versao": row.get("versao"),
            "marco_zero_deslocamento": self._marco_zero_deslocamento(row.get("estatisticas", {})),
        }

    def ensure_initialized(self, force: bool = False) -> dict[str, Any]:
        global _CACHE

        if not force:
            cached = self.get_overview()
            if cached:
                logger.info("baseline_skip", reason="already_initialized")
                return cached

        seed = self._load_seed()
        payload = self._build_overview_payload(seed)

        self.db.upsert(
            "baseline_escatologico",
            {
                "id": BASELINE_ID,
                "versao": payload["versao"],
                "estatisticas": payload["estatisticas"],
                "overview": payload["overview"],
                "categorias": payload["categorias"],
                "profecias_pendentes": payload["profecias_pendentes"],
                "sinais_gerais": payload["sinais_gerais"],
                "updated_at": datetime.now(UTC).isoformat(),
            },
            on_conflict="id",
        )

        arquivo_count = self._persist_arquivo(seed)
        self._persist_structured_events(seed)
        self._persist_timeline(payload["overview"], payload["estatisticas"])
        self._persist_graph(seed)
        self._persist_corpus_refs(seed)

        self.db.insert(
            "audit_log",
            {
                "camada": "baseline_historico",
                "modelo": "seed",
                "prompt_version": payload["versao"],
                "decisao": "initialized",
                "detalhes": {
                    "arquivo_profetico": arquivo_count,
                    "profecias_totais": payload["estatisticas"]["total_profecias_biblicas"],
                    "pendentes": payload["estatisticas"]["profecias_pendentes"],
                },
            },
        )

        _CACHE = payload
        logger.info(
            "baseline_initialized",
            profecias_cumpridas=payload["estatisticas"]["profecias_cumpridas"],
            pendentes=payload["estatisticas"]["profecias_pendentes"],
            arquivo=arquivo_count,
        )
        return payload
