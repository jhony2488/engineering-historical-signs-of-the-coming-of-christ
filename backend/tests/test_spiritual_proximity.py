"""Tests for spiritual proximity meter (Macro/Micro x Expansion/Contraction)."""

from motor.domain.spiritual_proximity import compute_spiritual_proximity


def test_balanced_macro_micro_and_energies_peak():
    prox = compute_spiritual_proximity(
        macro_ratio=0.5,
        expansao_ratio=0.5,
        avg_tension=0.7,
        avg_impact=0.7,
    )
    assert prox.convergencia_dimensao == 1.0
    assert prox.convergencia_energia == 1.0
    assert prox.score >= 0.7


def test_one_sided_dimension_lowers_convergence():
    prox = compute_spiritual_proximity(macro_ratio=1.0, expansao_ratio=0.5)
    assert prox.convergencia_dimensao == 0.0
    assert prox.score < 0.6


def test_to_dict_keys():
    d = compute_spiritual_proximity(0.4, 0.6, 0.5, 0.5).to_dict()
    assert "proximidade_espiritual" in d
    assert "convergencia_dimensao" in d
    assert "convergencia_energia" in d
    assert "descricao" in d
