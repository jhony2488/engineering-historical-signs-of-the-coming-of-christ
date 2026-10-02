from __future__ import annotations

from typing import TYPE_CHECKING, Any

import numpy as np

from motor.config import get_settings
from motor.domain.phases import FaseEscatologica

if TYPE_CHECKING:
    from motor.adapters.supabase import SupabaseClient


class PhaseHMM:
    """HMM discreto com Viterbi — implementação pura NumPy"""

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

    def fit(
        self,
        observations: list[int],
        max_iter: int | None = None,
        tol: float | None = None,
    ) -> dict[str, Any]:
        """Baum-Welch (EM) com forward-backward escalonado — NumPy puro.

        Treino offline via CLI `train-phase-hmm`; as matrizes resultantes
        seguem para `parametros_fase` como versão inativa até aprovação.
        """
        if not observations:
            return {"ok": False, "message": "sem observações"}
        settings = get_settings()
        max_iter = max_iter or settings.hmm_em_max_iter
        tol = tol or settings.hmm_em_tol
        obs = np.array([min(max(int(o), 0), self.N_EMISSIONS - 1) for o in observations])
        T = len(obs)
        loglik_prev = -np.inf
        converged = False
        iterations = 0

        for it in range(1, max_iter + 1):
            alpha = np.zeros((T, self.N_STATES))
            c = np.zeros(T)
            alpha[0] = self.startprob * self.emissionprob[:, obs[0]]
            c[0] = alpha[0].sum() or 1e-300
            alpha[0] /= c[0]
            for t in range(1, T):
                alpha[t] = (alpha[t - 1] @ self.transmat) * self.emissionprob[:, obs[t]]
                c[t] = alpha[t].sum() or 1e-300
                alpha[t] /= c[t]
            loglik = float(np.log(c).sum())

            beta = np.zeros((T, self.N_STATES))
            beta[T - 1] = 1.0
            for t in range(T - 2, -1, -1):
                beta[t] = (self.transmat @ (self.emissionprob[:, obs[t + 1]] * beta[t + 1])) / c[
                    t + 1
                ]

            gamma = alpha * beta
            gamma /= gamma.sum(axis=1, keepdims=True)

            xi_num = np.zeros((self.N_STATES, self.N_STATES))
            for t in range(T - 1):
                xi = (
                    np.outer(alpha[t], self.emissionprob[:, obs[t + 1]] * beta[t + 1])
                    * self.transmat
                )
                s = xi.sum()
                if s > 0:
                    xi_num += xi / s

            self.startprob = gamma[0]
            row = xi_num.sum(axis=1, keepdims=True)
            self.transmat = np.divide(
                xi_num,
                row,
                out=np.full_like(xi_num, 1.0 / self.N_STATES),
                where=row > 0,
            )
            self.transmat /= self.transmat.sum(axis=1, keepdims=True)

            emit = np.zeros((self.N_STATES, self.N_EMISSIONS))
            for e in range(self.N_EMISSIONS):
                emit[:, e] = gamma[obs == e].sum(axis=0)
            grow = emit.sum(axis=1, keepdims=True)
            self.emissionprob = np.divide(
                emit,
                grow,
                out=np.full_like(emit, 1.0 / self.N_EMISSIONS),
                where=grow > 0,
            )
            self.emissionprob /= self.emissionprob.sum(axis=1, keepdims=True)

            iterations = it
            if abs(loglik - loglik_prev) < tol:
                converged = True
                loglik_prev = loglik
                break
            loglik_prev = loglik

        return {
            "ok": True,
            "log_likelihood": round(loglik_prev, 6),
            "iterations": iterations,
            "converged": converged,
            "n_observations": T,
        }

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


def observations_from_resultados(rows: list[dict[str, Any]]) -> list[int]:
    """Reconstrói a série diária de observações (1 por resultado) a partir de
    `resultados_escatologicos` — insumo do EM (`train-phase-hmm`) e do
    histórico passado ao `CorrelationEngine` no run diário."""
    obs: list[int] = []
    for row in sorted(rows, key=lambda r: str(r.get("data_referencia", ""))):
        metricas = ((row.get("json_analise_ia") or {}).get("correlacao") or {}).get(
            "metricas"
        ) or {}
        if metricas:
            obs.append(
                discretize_observation(
                    float(metricas.get("avg_tension", 0.5)),
                    float(metricas.get("avg_impact", 0.5)),
                    float(metricas.get("contracao_ratio", 0.5)) > 0.5,
                )
            )
        else:
            tension = float(row.get("indice_global") or 0.5)
            obs.append(discretize_observation(tension, tension, False))
    return obs
