from motor.math.bayesian import atualizar_conviccao_bayesiana, update_phase_conviction_sequence


def test_bayes_update_increases_conviction():
    prior = 0.20
    posterior = atualizar_conviccao_bayesiana(prior, 0.80, 0.10)
    assert posterior > prior
    assert 0 < posterior < 1


def test_bayes_weak_evidence_stable():
    prior = 0.50
    posterior = atualizar_conviccao_bayesiana(prior, 0.55, 0.50)
    assert abs(posterior - prior) < 0.1


def test_sequence_update():
    events = [(0.8, 0.1), (0.7, 0.2)]
    result = update_phase_conviction_sequence(0.2, events)
    assert result > 0.2


def test_bayes_posterior_bounded():
    posterior = atualizar_conviccao_bayesiana(0.5, 0.99, 0.01)
    assert 0 < posterior < 1


def test_bayes_evidence_favoring_not_h_decreases():
    prior = 0.6
    posterior = atualizar_conviccao_bayesiana(prior, 0.01, 0.9)
    assert posterior < prior


def test_sequence_empty_events_returns_prior():
    assert update_phase_conviction_sequence(0.35, []) == 0.35
