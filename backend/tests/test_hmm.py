"""Phase HMM and observation discretization tests."""

from motor.domain.phases import FaseEscatologica
from motor.math.hmm import PhaseHMM, discretize_observation


def test_discretize_observation_high_tension_contraction():
    obs = discretize_observation(tension=0.9, impact=0.8, energy_contraction=True)
    assert 0 <= obs <= 7
    assert obs >= 5


def test_discretize_observation_low_calm():
    obs = discretize_observation(tension=0.1, impact=0.1, energy_contraction=False)
    assert obs <= 2


def test_hmm_distribution_sums_to_one():
    hmm = PhaseHMM()
    dist = hmm.predict_phase_distribution([3, 4, 5, 6])
    assert abs(sum(dist.values()) - 1.0) < 0.01
    assert set(dist.keys()) == {f.value for f in FaseEscatologica}


def test_hmm_empty_observations_uniform():
    hmm = PhaseHMM()
    dist = hmm.predict_phase_distribution([])
    assert all(abs(v - 0.25) < 0.01 for v in dist.values())


def test_hmm_most_likely_phase_valid():
    hmm = PhaseHMM()
    phase, prob = hmm.most_likely_phase([6, 7, 7, 6, 5])
    assert phase in FaseEscatologica
    assert 0 < prob <= 1


def test_hmm_fit_or_default_with_long_series():
    hmm = PhaseHMM()
    observations = [7] * 25
    hmm.fit_or_default(observations)
    dist = hmm.predict_phase_distribution(observations)
    assert len(dist) == 4


def test_hmm_load_parametros_from_row():
    hmm = PhaseHMM()
    hmm._load_parametros(
        {
            "transicoes": {
                "startprob": [0.4, 0.3, 0.2, 0.1],
                "matrix": [
                    [0.8, 0.1, 0.05, 0.05],
                    [0.1, 0.7, 0.15, 0.05],
                    [0.05, 0.15, 0.6, 0.2],
                    [0.02, 0.08, 0.2, 0.7],
                ],
            },
            "emissoes": [[0.125] * 8 for _ in range(4)],
        }
    )
    assert abs(hmm.startprob.sum() - 1.0) < 0.01
    assert abs(hmm.transmat.sum(axis=1) - 1.0).max() < 0.01
