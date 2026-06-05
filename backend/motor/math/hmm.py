from __future__ import annotations

from typing import TYPE_CHECKING, Any

import numpy as np

from motor.domain.phases import FaseEscatologica

if TYPE_CHECKING:
    from motor.adapters.supabase import SupabaseClient


class PhaseHMM:
    """HMM discreto com Viterbi — implementação pura NumPy (sem hmmlearn)."""

    N_STATES = 4
    N_EMISSIONS = 8

    def __init__(self) -> None:
        self.startprob, self.transmat, self.emissionprob = self._default_matrices()

    @classmethod
    def from_db(cls, db: SupabaseClient | None = None) -> PhaseHMM:
        hmm = cls()
        if db is None:
            from motor.adapters.supabase import get_supabase

            db = get_supabase()
        row = db.get_active_parametros_fase()
        if row:
            hmm._load_parametros(row)
        return hmm

    def _load_parametros(self, row: dict[str, Any]) -> None:
        try:
            trans = row.get("transicoes") or {}
            if isinstance(trans, dict):
                start = trans.get("startprob")
                matrix = trans.get("matrix")
                if start and len(start) == self.N_STATES:
                    self.startprob = np.array(start, dtype=float)
                    self.startprob /= self.startprob.sum()
                if matrix and len(matrix) == self.N_STATES:
                    self.transmat = np.array(matrix, dtype=float)
                    self.transmat /= self.transmat.sum(axis=1, keepdims=True)

            em = row.get("emissoes")
            if isinstance(em, list) and len(em) == self.N_STATES:
                self.emissionprob = np.array(em, dtype=float)
                self.emissionprob /= self.emissionprob.sum(axis=1, keepdims=True)
        except (TypeError, ValueError):
            pass

    def _default_matrices(self) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        startprob = np.array([0.5, 0.3, 0.15, 0.05])
        transmat = np.array(
            [
                [0.7, 0.2, 0.08, 0.02],
                [0.1, 0.6, 0.25, 0.05],
                [0.05, 0.15, 0.55, 0.25],
                [0.02, 0.08, 0.2, 0.7],
            ]
        )
        emissionprob = np.ones((self.N_STATES, self.N_EMISSIONS)) / self.N_EMISSIONS
        # Fases avançadas emitem observações de maior intensidade com mais frequência
        for s in range(self.N_STATES):
            for e in range(self.N_EMISSIONS):
                if e >= s * 2:
                    emissionprob[s, e] *= 1.5
        emissionprob /= emissionprob.sum(axis=1, keepdims=True)
        return startprob, transmat, emissionprob

    def fit_or_default(self, observations: list[int] | None = None) -> None:
        """v1: usa matrizes default; extensível para EM com observações longas."""
        if observations and len(observations) >= 20:
            counts = np.zeros(self.N_EMISSIONS)
            for o in observations:
                counts[min(o, self.N_EMISSIONS - 1)] += 1
            counts = counts / counts.sum()
            for s in range(self.N_STATES):
                self.emissionprob[s] = 0.7 * self.emissionprob[s] + 0.3 * counts

    def _viterbi(self, observations: list[int]) -> list[int]:
        T = len(observations)
        delta = np.zeros((T, self.N_STATES))
        psi = np.zeros((T, self.N_STATES), dtype=int)

        o0 = min(observations[0], self.N_EMISSIONS - 1)
        delta[0] = np.log(self.startprob + 1e-12) + np.log(self.emissionprob[:, o0] + 1e-12)

        for t in range(1, T):
            ot = min(observations[t], self.N_EMISSIONS - 1)
            for s in range(self.N_STATES):
                probs = delta[t - 1] + np.log(self.transmat[:, s] + 1e-12)
                psi[t, s] = int(np.argmax(probs))
                delta[t, s] = probs[psi[t, s]] + np.log(self.emissionprob[s, ot] + 1e-12)

        path = [0] * T
        path[T - 1] = int(np.argmax(delta[T - 1]))
        for t in range(T - 2, -1, -1):
            path[t] = psi[t + 1, path[t + 1]]
        return path

    def predict_phase_distribution(self, observations: list[int]) -> dict[str, float]:
        self.fit_or_default(observations)
        if not observations:
            return {f.value: 0.25 for f in FaseEscatologica}

        path = self._viterbi(observations)
        last_state = path[-1]
        posterior = self.transmat[last_state].copy()
        phases = list(FaseEscatologica)
        return {phases[i].value: float(posterior[i]) for i in range(self.N_STATES)}

    def most_likely_phase(self, observations: list[int]) -> tuple[FaseEscatologica, float]:
        dist = self.predict_phase_distribution(observations)
        best = max(dist, key=dist.get)
        return FaseEscatologica(best), dist[best]


def discretize_observation(tension: float, impact: float, energy_contraction: bool) -> int:
    base = int(min(3, tension * 4)) + int(min(3, impact * 4))
    if energy_contraction:
        base = min(7, base + 2)
    return max(0, min(7, base))
