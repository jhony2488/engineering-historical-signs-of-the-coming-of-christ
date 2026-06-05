"""Domain classifier tests: energies, macro/micro and beasts."""

from motor.domain.beasts import compute_beast_scores
from motor.domain.energies import Energia, classify_energy_heuristic
from motor.domain.macro_micro import Dimensao, classify_dimension


def test_classify_energy_expansao():
    text = "despertamento espiritual com evangelho e caridade nas comunidades"
    assert classify_energy_heuristic(text) == Energia.EXPANSAO


def test_classify_energy_contracao():
    text = "expansão de vigilância digital e perseguição com controle totalitário"
    assert classify_energy_heuristic(text) == Energia.CONTRACAO


def test_classify_dimension_macro():
    text = "governança global no oriente medio com cbdc e guerra"
    assert classify_dimension(text) == Dimensao.MACRO


def test_classify_dimension_micro():
    text = "comunidade local com discernimento e fidelidade na igreja"
    assert classify_dimension(text) == Dimensao.MICRO


def test_compute_beast_scores_bounded():
    scores = compute_beast_scores(0.9, 0.8, 0.7, 0.85, 0.75)
    assert 0 <= scores.besta_mar <= 1.0
    assert 0 <= scores.besta_terra <= 1.0
    assert scores.besta_mar > 0.5
    assert scores.besta_terra > 0.5


def test_compute_beast_scores_low_inputs():
    scores = compute_beast_scores(0.1, 0.1, 0.1, 0.1, 0.1)
    assert scores.besta_mar < 0.35
    assert scores.besta_terra <= 0.15
