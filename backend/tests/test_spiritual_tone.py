"""Testes do analisador de tom espiritual (heurística v1)."""

from motor.ml.spiritual_tone import SpiritualToneAnalyzer


def test_analyze_expansao_heuristic():
    analyzer = SpiritualToneAnalyzer()
    result = analyzer.analyze("evangelho e despertamento com caridade e fidelidade")
    assert result.energia == "expansao"
    assert result.expansao_score > result.contracao_score
    assert result.modelo == "heuristic"


def test_analyze_contracao_heuristic():
    analyzer = SpiritualToneAnalyzer()
    result = analyzer.analyze("perseguição totalitária com engano e vigilância digital")
    assert result.energia == "contracao"
    assert result.contracao_score > result.expansao_score


def test_analyze_scores_bounded():
    analyzer = SpiritualToneAnalyzer()
    result = analyzer.analyze("texto neutro sem indicadores fortes")
    assert 0 <= result.expansao_score <= 1
    assert 0 <= result.contracao_score <= 1
