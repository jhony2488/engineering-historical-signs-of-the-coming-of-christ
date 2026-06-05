from __future__ import annotations

import json
from datetime import date, timedelta
from typing import Any

import structlog

from motor.adapters.supabase import SupabaseClient, get_supabase
from motor.config import CONFIG_DIR, get_settings
from motor.math.mcda import rank_candidates
from motor.ml.graph import PropheticGraph
from motor.ml.spiritual_tone import SpiritualToneAnalyzer
from motor.pipeline.correlation.engine import CorrelationEngine
from motor.pipeline.embeddings.service import EmbeddingService
from motor.pipeline.fulfillment_tracker import FulfillmentTracker
from motor.pipeline.historical_baseline import HistoricalBaselineService
from motor.pipeline.ingestion.collector import IngestionCollector
from motor.pipeline.llm.layers import LLMPipeline
from motor.pipeline.newsletter_service import NewsletterDigestService
from motor.pipeline.preprocessing.processor import Preprocessor
from motor.pipeline.reports.generator import ReportGenerator
from motor.schemas.validator import get_validator

logger = structlog.get_logger()


class DailyOrchestrator:
    def __init__(self, db: SupabaseClient | None = None) -> None:
        self.db = db or get_supabase()
        self.settings = get_settings()
        self.collector = IngestionCollector()
        self.preprocessor = Preprocessor()
        self.embeddings = EmbeddingService()
        self.llm = LLMPipeline()
        self.correlation = CorrelationEngine()
        self.reports = ReportGenerator()
        self.tone = SpiritualToneAnalyzer()
        self.graph = PropheticGraph()
        self.validator = get_validator()

    def _load_candidates(self) -> list[dict[str, Any]]:
        path = CONFIG_DIR / "candidatos_seed.json"
        with path.open(encoding="utf-8") as f:
            return json.load(f)

    def _load_yesterday_pap(self, ref_date: date) -> dict[str, float]:
        prior_date = ref_date - timedelta(days=1)
        pap: dict[str, float] = {}
        for personagem in ("besta_mar", "besta_terra"):
            for row in self.db.get_ranking(personagem, prior_date):
                cid = row.get("candidato_id")
                if cid:
                    pap[cid] = float(row.get("probabilidade_atual", 0))
        return pap

    def _build_rankings(
        self, ref_date: date, prior_pap: dict[str, float] | None = None
    ) -> tuple[list, list]:
        candidates = self._load_candidates()
        yesterday_pap = self._load_yesterday_pap(ref_date)
        prior_frac = prior_pap or {k: v / 100.0 for k, v in yesterday_pap.items()}
        mar = rank_candidates(candidates, "besta_mar", prior_frac)
        terra = rank_candidates(candidates, "besta_terra", prior_frac)

        ranking_mar, ranking_terra = [], []
        for i, c in enumerate(mar, 1):
            tendencia = round(c.pap - yesterday_pap.get(c.candidato_id, c.pap), 1)
            entry = {
                "posicao": i,
                "candidato_id": c.candidato_id,
                "nome": c.nome,
                "personagem": "besta_mar",
                "probabilidade_atual": c.pap,
                "tendencia_24h": tendencia,
                "fator_principal": c.fator_principal,
                "scores_criterio": c.scores_criterio,
            }
            self.validator.validate("ranking_candidato", entry)
            ranking_mar.append(entry)
            self.db.insert(
                "ranking_probabilistico",
                {
                    **entry,
                    "data_referencia": ref_date.isoformat(),
                },
            )

        for i, c in enumerate(terra, 1):
            tendencia = round(c.pap - yesterday_pap.get(c.candidato_id, c.pap), 1)
            entry = {
                "posicao": i,
                "candidato_id": c.candidato_id,
                "nome": c.nome,
                "personagem": "besta_terra",
                "probabilidade_atual": c.pap,
                "tendencia_24h": tendencia,
                "fator_principal": c.fator_principal,
                "scores_criterio": c.scores_criterio,
            }
            self.validator.validate("ranking_candidato", entry)
            ranking_terra.append(entry)
            self.db.insert(
                "ranking_probabilistico",
                {
                    **entry,
                    "data_referencia": ref_date.isoformat(),
                },
            )

        return ranking_mar, ranking_terra

    def _persist_graph(self) -> None:
        self.graph.seed_default()
        nodes, edges = self.graph.to_records()
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

    async def run_daily(self, ref_date: date | None = None, force: bool = False) -> dict[str, Any]:
        ref_date = ref_date or date.today()
        logger.info("daily_run_start", date=ref_date.isoformat(), force=force)

        if not force and self.db.exists_resultado_for_date(ref_date):
            logger.info("daily_run_skip", reason="already_exists")
            latest = self.db.get_latest_resultado()
            return latest or {}

        # Camada 0 — Baseline histórico (profecias cumpridas antes do 1º run diário)
        baseline = HistoricalBaselineService(self.db).ensure_initialized()

        # Camada 1 — Ingestão
        docs = await self.collector.collect_all()
        saved_docs = self.collector.persist(self.db, docs) if docs else []

        # Camada 2 — Pré-processamento
        all_chunks: list[dict] = []
        for doc in saved_docs:
            doc_id = str(doc.get("id", "local"))
            chunks = self.preprocessor.process_document(doc_id, doc.get("conteudo", ""))
            rows = self.preprocessor.persist(self.db, chunks)
            all_chunks.extend(rows)

        if not all_chunks and docs:
            for i, doc in enumerate(docs):
                chunks = self.preprocessor.process_document(f"mem-{i}", doc.conteudo)
                all_chunks.extend([{"id": f"mem-{i}-{c.indice}", "texto": c.texto} for c in chunks])

        # Camada 3 — Embeddings + RAG
        self.embeddings.seed_corpus(self.db)
        for chunk in all_chunks[:20]:
            cid = str(chunk.get("id", ""))
            texto = chunk.get("texto", "")
            if texto:
                self.embeddings.persist(self.db, cid, texto)

        rag = self.embeddings.rag_teologico(
            " ".join(c.get("texto", "")[:200] for c in all_chunks[:3])
        )

        # Tom espiritual nos trechos
        tones = [self.tone.analyze(c.get("texto", "")) for c in all_chunks[:5]]

        # Camadas 4-7 — LLM
        events = await self.llm.extract_events(all_chunks, rag, self.db)
        if not events and all_chunks:
            events = [
                {
                    "evento": "sinal_geopolitico",
                    "regiao": "global",
                    "grau_tensao": 0.5,
                    "impacto_global": 0.45,
                    "energia": "contracao",
                    "dimensao": "macro",
                }
            ]

        timeline = await self.llm.build_timeline(events, self.db)
        reasoning = await self.llm.reason(
            {
                "eventos": events,
                "timeline": timeline,
                "tons": [
                    {"expansao": t.expansao_score, "contracao": t.contracao_score} for t in tones
                ],
            },
            self.db,
        )
        interpretation = await self.llm.interpret(events, rag, self.db)

        # Camada 8 — Correlação
        prior = 0.2
        latest = self.db.get_latest_resultado()
        if latest:
            prior = latest.get("probabilidade_fase", 0.2)

        correlacao = self.correlation.correlate(events, reasoning, prior_conviction=prior)

        if correlacao["confianca"] < self.settings.phase_confidence_min:
            logger.warning("low_confidence", confianca=correlacao["confianca"])

        # Grafo
        self._persist_graph()
        graph_score = self.graph.detect_convergent_influence(["lider_global"])

        # Rankings
        ranking_mar, ranking_terra = self._build_rankings(ref_date)

        # Camada 8b — Detecção de profecias recém-cumpridas
        novas_cumpridas = FulfillmentTracker(self.db).detect_and_record(
            ref_date,
            events,
            interpretation,
            correlacao["fase"],
            correlacao["confianca"],
        )
        baseline = HistoricalBaselineService(self.db).get_overview() or baseline

        # Camada 9 — Relatório
        transicao = correlacao.get("transicao_fase", {})
        needs_review = (
            transicao.get("transicao_entre_fases") and not self.settings.auto_approve_criteria
        )

        payload: dict[str, Any] = {
            "schema_version": "1.0.0",
            "baseline_historico": {
                "estatisticas": baseline.get("estatisticas"),
                "overview_resumo": baseline.get("overview", {}).get("resumo"),
                "marco_zero_deslocamento": baseline.get("marco_zero_deslocamento"),
                "profecias_pendentes": baseline.get("estatisticas", {}).get(
                    "profecias_pendentes", 22
                ),
                "novas_cumpridas_hoje": novas_cumpridas,
                "atualizacoes_recentes": (baseline.get("atualizacoes") or [])[:5],
            },
            "data_referencia": ref_date.isoformat(),
            "fase_atual": correlacao["fase"],
            "probabilidade_fase": correlacao["probabilidade_hmm"].get(
                correlacao["fase"], correlacao["confianca"]
            ),
            "indice_global": correlacao["indice_global"],
            "confianca": correlacao["confianca"],
            "correlacao": correlacao,
            "transicao_fase": correlacao.get("transicao_fase", {}),
            "eventos_analisados": events,
            "metricas": {
                **correlacao.get("metricas", {}),
                "graph_convergence": graph_score,
                "tons_analisados": len(tones),
            },
            "linha_temporal": timeline,
            "interpretacao": interpretation,
            "ranking_mar": ranking_mar,
            "ranking_terra": ranking_terra,
            "revisao_humana": not needs_review,
            "status": "pending_review" if needs_review else "complete",
        }
        payload["relatorio_html"] = self.reports.generate_html(payload)
        try:
            payload["relatorio_pdf_b64"] = (
                __import__("base64")
                .b64encode(self.reports.generate_pdf_bytes(payload))
                .decode("ascii")
            )
        except Exception:
            payload["relatorio_pdf_b64"] = None

        self.validator.validate("resultado_escatologico", payload)

        self.db.insert(
            "resultados_escatologicos",
            {
                "data_referencia": ref_date.isoformat(),
                "fase_atual": payload["fase_atual"],
                "probabilidade_fase": payload["probabilidade_fase"],
                "indice_global": payload["indice_global"],
                "confianca": payload["confianca"],
                "json_analise_ia": payload,
            },
        )

        newsletter_result = NewsletterDigestService(self.db).send_daily_digest(ref_date, payload)
        payload["newsletter_enviados"] = newsletter_result

        logger.info(
            "daily_run_complete",
            fase=payload["fase_atual"],
            indice=payload["indice_global"],
            newsletter_sent=newsletter_result.get("sent", 0),
        )
        return payload
