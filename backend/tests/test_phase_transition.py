from motor.domain.phase_transition import detect_phase_transition


def test_transition_between_adjacent_phases():
    scores = {
        "FASE_I": 0.10,
        "FASE_II": 0.42,
        "FASE_III": 0.38,
        "FASE_IV": 0.10,
    }
    result = detect_phase_transition(scores, margin_max=0.15)
    assert result.transicao_entre_fases is True
    assert result.fase_dominante == "FASE_II"
    assert result.fase_secundaria == "FASE_III"
    assert result.margem_fases == 0.04


def test_no_transition_clear_winner():
    scores = {
        "FASE_I": 0.05,
        "FASE_II": 0.70,
        "FASE_III": 0.15,
        "FASE_IV": 0.10,
    }
    result = detect_phase_transition(scores, margin_max=0.15)
    assert result.transicao_entre_fases is False
    assert result.fase_dominante == "FASE_II"


def test_no_transition_non_adjacent_runner_up():
    scores = {
        "FASE_I": 0.40,
        "FASE_II": 0.12,
        "FASE_III": 0.10,
        "FASE_IV": 0.38,
    }
    result = detect_phase_transition(scores, margin_max=0.15)
    assert result.transicao_entre_fases is False


def test_empty_scores_returns_safe_default():
    result = detect_phase_transition({})
    assert result.transicao_entre_fases is False
    assert "insuficiente" in result.descricao.lower()


def test_transition_to_dict_serializable():
    scores = {"FASE_II": 0.42, "FASE_III": 0.38, "FASE_I": 0.10, "FASE_IV": 0.10}
    result = detect_phase_transition(scores, margin_max=0.15)
    d = result.to_dict()
    assert d["fase_dominante"] == "FASE_II"
    assert "descricao" in d


def test_transition_proximity_below_threshold():
    scores = {"FASE_II": 0.80, "FASE_III": 0.30, "FASE_I": 0.05, "FASE_IV": 0.05}
    result = detect_phase_transition(scores, margin_max=0.15, proximity_min=0.72)
    assert result.transicao_entre_fases is False
