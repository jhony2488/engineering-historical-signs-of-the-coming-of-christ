"""Cross-encoder: rerank do RAG teológico e blend no FulfillmentTracker."""

from __future__ import annotations

from datetime import date

import pytest

from motor.config import get_settings
from motor.ml.reranker import BgeReranker
from motor.pipeline.embeddings.service import EmbeddingService
from motor.pipeline.fulfillment_tracker import FulfillmentTracker

from .conftest import FakeSupabase


def test_reranker_unavailable_returns_none(monkeypatch) -> None:
    monkeypatch.setenv("RERANKER_ENABLED", "false")
    get_settings.cache_clear()
    try:
        r = BgeReranker()
        assert not r.is_available
        assert r.score_pairs([("a", "b")]) is None
    finally:
        monkeypatch.delenv("RERANKER_ENABLED", raising=False)
        get_settings.cache_clear()


def test_rerank_orders_candidates(monkeypatch) -> None:
    monkeypatch.setattr(
        BgeReranker, "score_pairs", lambda self, pairs: [0.1] * len(pairs)
    )
    svc = EmbeddingService()
    candidates = [
        {"referencia": "a", "texto": "primeiro", "tema": ""},
        {"referencia": "b", "texto": "segundo", "tema": ""},
    ]
    monkeypatch.setattr(
        BgeReranker, "score_pairs", lambda self, pairs: [0.1, 9.9][: len(pairs)]
    )
    ranked = svc._rerank("consulta", candidates)
    assert [c["referencia"] for c in ranked] == ["b", "a"]


def test_rerank_none_keeps_cosine_order(monkeypatch) -> None:
    monkeypatch.setattr(BgeReranker, "score_pairs", lambda self, pairs: None)
    svc = EmbeddingService()
    candidates = [
        {"referencia": "a", "texto": "primeiro", "tema": ""},
        {"referencia": "b", "texto": "segundo", "tema": ""},
    ]
    assert svc._rerank("consulta", candidates) is None


class _StubReranker:
    def score_pairs(self, pairs):
        return [5.0] * len(pairs)  # sigmoid ≈ 0.993

    @staticmethod
    def sigmoid(x: float) -> float:
        import math

        return 1.0 / (1.0 + math.exp(-x))


def test_fulfillment_blends_cross_encoder(monkeypatch) -> None:
    db = FakeSupabase(
        tables={
            "arquivo_profetico": [
                {
                    "id": "pend_x",
                    "titulo": "cbdc moeda digital piloto compra venda",
                    "status": "pendente",
                    "categoria": "pendente_escatologico",
                    "referencias": [],
                    "descricao": "marca para compra e venda via moeda digital",
                },
                {
                    "id": "pend_y",
                    "titulo": "assunto sem relacao alguma zzz",
                    "status": "pendente",
                    "categoria": "pendente_escatologico",
                    "referencias": [],
                    "descricao": "nada relacionado",
                },
            ],
            "baseline_escatologico": [{"id": "global", "atualizacoes": [], "estatisticas": {}}],
        }
    )
    tracker = FulfillmentTracker(db)
    monkeypatch.setattr(tracker, "_get_reranker", lambda: _StubReranker())

    events = [
        {
            "evento": "avanco_tecnologico_controle",
            "descricao": "Banco central lança piloto de CBDC com biometria para compra e venda.",
            "regiao": "global",
        }
    ]
    out = tracker.detect_and_record(date(2026, 6, 4), events, None, "FASE_II", 0.9)
    assert any(u["profecia_id"] == "pend_x" for u in out)
    assert not any(u["profecia_id"] == "pend_y" for u in out)


def test_fulfillment_lexical_only_when_ce_off(monkeypatch) -> None:
    monkeypatch.setenv("RERANKER_ENABLED", "false")
    get_settings.cache_clear()
    try:
        db = FakeSupabase(tables={"arquivo_profetico": []})
        tracker = FulfillmentTracker(db)
        assert tracker._get_reranker() is None
    finally:
        monkeypatch.delenv("RERANKER_ENABLED", raising=False)
        get_settings.cache_clear()


def test_sigmoid_bounds() -> None:
    assert 0.0 < BgeReranker.sigmoid(-10) < 0.01
    assert BgeReranker.sigmoid(0) == pytest.approx(0.5)
    assert 0.99 < BgeReranker.sigmoid(10) < 1.0
