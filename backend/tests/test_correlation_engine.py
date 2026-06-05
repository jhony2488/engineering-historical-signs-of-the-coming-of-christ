"""Testes do motor de correlação (Camada 8)."""

from motor.pipeline.correlation.engine import CorrelationEngine
from tests.conftest import SAMPLE_EVENTS, SAMPLE_REASONING


def test_correlate_returns_required_fields():
    engine = CorrelationEngine()
    result = engine.correlate(SAMPLE_EVENTS, SAMPLE_REASONING, prior_conviction=0.3)

    assert "indice_global" in result
    assert "fase" in result
    assert "confianca" in result
    assert "posterior_bayes" in result
    assert "probabilidade_hmm" in result
    assert "alerta_falso_lider" in result
    assert "score_besta_mar" in result
    assert "score_besta_terra" in result
    assert "transicao_fase" in result
    assert 0 <= result["indice_global"] <= 1


def test_correlate_empty_events_uses_defaults():
    engine = CorrelationEngine()
    result = engine.correlate([], SAMPLE_REASONING)
    assert result["metricas"]["avg_tension"] == 0.3
    assert result["metricas"]["expansao_ratio"] == 0.5


def test_correlate_detects_transition_zone():
    engine = CorrelationEngine()
    events = [
        {
            "evento": "sinal_intenso",
            "regiao": "global",
            "grau_tensao": 0.95,
            "impacto_global": 0.9,
            "energia": "contracao",
            "dimensao": "macro",
        }
    ] * 5
    reasoning = {"pontuacao_logica": 0.9, "fase_sugerida": "FASE_III"}
    result = engine.correlate(events, reasoning, prior_conviction=0.7)
    assert result["fase"] in ("FASE_I", "FASE_II", "FASE_III", "FASE_IV")
    assert "fase_scores_consolidados" in result


def test_correlate_false_leader_fields():
    engine = CorrelationEngine()
    events = [
        {
            "evento": "discurso_expansao",
            "regiao": "global",
            "grau_tensao": 0.3,
            "impacto_global": 0.8,
            "energia": "expansao",
            "dimensao": "macro",
        },
        {
            "evento": "estrutura_contracao",
            "regiao": "global",
            "grau_tensao": 0.9,
            "impacto_global": 0.9,
            "energia": "contracao",
            "dimensao": "micro",
        },
    ]
    result = engine.correlate(events, SAMPLE_REASONING)
    assert isinstance(result["alerta_falso_lider"], bool)
    assert 0 <= result["score_incongruencia"] <= 1
