"""Gate de relevância (camada 3.5): ranking zero-shot/lexical de chunks."""

from __future__ import annotations

from motor.config import get_settings
from motor.ml.relevance import RelevanceGate

RELEVANT = (
    "O Oriente Médio viu escalada de conflito após novo tratado de coalizão; "
    "relatos de perseguição religiosa e avanço de CBDC com biometria em bloco econômico."
)
IRRELEVANT = (
    "A final do campeonato terminou empatada; torcedores celebraram com festa "
    "e música no estádio até a madrugada."
)


def _chunks() -> list[dict]:
    return [
        {"id": "c1", "texto": IRRELEVANT},
        {"id": "c2", "texto": RELEVANT},
        {"id": "c3", "texto": "texto neutro qualquer sem sinais"},
    ]


def test_lexical_fallback_scores_relevant_higher() -> None:
    gate = RelevanceGate(embeddings=None)
    score_rel, model = gate.score(RELEVANT)
    score_irr, _ = gate.score(IRRELEVANT)
    assert model == "lexical_v1"
    assert score_rel > score_irr


def test_rank_orders_and_annotates() -> None:
    gate = RelevanceGate(embeddings=None)
    ranked = gate.rank(_chunks())
    assert ranked[0]["id"] == "c2"
    assert all("relevancia" in c for c in ranked)
    assert gate.model_used == "lexical_v1"


def test_rank_disabled_returns_input(monkeypatch) -> None:
    monkeypatch.setenv("RELEVANCE_GATE_ENABLED", "false")
    get_settings.cache_clear()
    try:
        gate = RelevanceGate(embeddings=None)
        chunks = _chunks()
        ranked = gate.rank(chunks)
        assert ranked == chunks
        assert gate.model_used == "disabled"
    finally:
        monkeypatch.delenv("RELEVANCE_GATE_ENABLED", raising=False)
        get_settings.cache_clear()


def test_min_score_filters(monkeypatch) -> None:
    monkeypatch.setenv("RELEVANCE_MIN_SCORE", "0.5")
    get_settings.cache_clear()
    try:
        gate = RelevanceGate(embeddings=None)
        ranked = gate.rank(_chunks())
        assert all(c["relevancia"] >= 0.5 for c in ranked)
    finally:
        monkeypatch.delenv("RELEVANCE_MIN_SCORE", raising=False)
        get_settings.cache_clear()
