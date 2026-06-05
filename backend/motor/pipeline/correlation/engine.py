from __future__ import annotations

from typing import Any

from motor.adapters.supabase import get_supabase
from motor.config import get_settings
from motor.domain.beasts import compute_beast_scores
from motor.domain.energies import Energia
from motor.domain.false_leader import detect_false_leader
from motor.domain.phase_transition import detect_phase_transition
from motor.domain.phases import FaseEscatologica
from motor.math.bayesian import update_phase_conviction_sequence
from motor.math.hmm import PhaseHMM, discretize_observation
from motor.schemas.validator import get_validator


class CorrelationEngine:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.validator = get_validator()
        self.hmm = PhaseHMM.from_db(get_supabase())

    def _aggregate_metrics(self, events: list[dict[str, Any]]) -> dict[str, float]:
        if not events:
            return {
                "avg_tension": 0.3,
                "avg_impact": 0.3,
                "expansao_ratio": 0.5,
                "macro_ratio": 0.5,
                "score_expansao_discurso": 0.3,
                "score_contracao_estrutura": 0.3,
            }
        tensions = [e.get("grau_tensao", 0.5) for e in events]
        impacts = [e.get("impacto_global", 0.5) for e in events]
        expansao = sum(1 for e in events if e.get("energia") == Energia.EXPANSAO.value)
        macro = sum(1 for e in events if e.get("dimensao") == "macro")
        n = len(events)
        expansao_macro = sum(
            1
            for e in events
            if e.get("energia") == Energia.EXPANSAO.value and e.get("dimensao") == "macro"
        )
        contracao_micro = sum(
            1
            for e in events
            if e.get("energia") == Energia.CONTRACAO.value and e.get("dimensao") == "micro"
        )
        return {
            "avg_tension": sum(tensions) / n,
            "avg_impact": sum(impacts) / n,
            "expansao_ratio": expansao / n,
            "macro_ratio": macro / n,
            "score_expansao_discurso": expansao_macro / max(1, macro),
            "score_contracao_estrutura": contracao_micro / max(1, n - macro),
        }

    def correlate(
        self,
        events: list[dict[str, Any]],
        reasoning: dict[str, Any],
        prior_conviction: float = 0.2,
        historical_observations: list[int] | None = None,
    ) -> dict[str, Any]:
        metrics = self._aggregate_metrics(events)
        bayes_events = [
            (min(0.95, e.get("grau_tensao", 0.5)), max(0.05, 0.3 - e.get("grau_tensao", 0.5) * 0.2))
            for e in events[:5]
        ] or [(0.5, 0.2)]
        posterior = update_phase_conviction_sequence(prior_conviction, bayes_events)

        observations = historical_observations or []
        for e in events:
            observations.append(
                discretize_observation(
                    e.get("grau_tensao", 0.5),
                    e.get("impacto_global", 0.5),
                    e.get("energia") == Energia.CONTRACAO.value,
                )
            )
        hmm_dist = self.hmm.predict_phase_distribution(observations)
        _phase_hmm, prob_hmm = self.hmm.most_likely_phase(observations)

        score_llm = float(reasoning.get("pontuacao_logica", 0.5))
        fase_llm = reasoning.get("fase_sugerida", FaseEscatologica.FASE_II.value)

        w_b, w_h, w_l = (
            self.settings.weight_bayes,
            self.settings.weight_hmm,
            self.settings.weight_llm,
        )
        indice_global = w_b * posterior + w_h * prob_hmm + w_l * score_llm

        false_leader = detect_false_leader(
            metrics["score_expansao_discurso"],
            metrics["score_contracao_estrutura"],
        )
        beasts = compute_beast_scores(
            centralizacao_geopolitica=metrics["macro_ratio"],
            controle_subsistencia=metrics["score_contracao_estrutura"],
            validacao_lider=metrics["expansao_ratio"],
            monopolio_narrativa=metrics["score_contracao_estrutura"],
            prodigios_tecnologicos=metrics["avg_impact"],
        )

        # Fase publicada: combina HMM, LLM e índice
        phase_scores = {
            FaseEscatologica.FASE_I.value: hmm_dist.get(FaseEscatologica.FASE_I.value, 0.25),
            FaseEscatologica.FASE_II.value: hmm_dist.get(FaseEscatologica.FASE_II.value, 0.25),
            FaseEscatologica.FASE_III.value: hmm_dist.get(FaseEscatologica.FASE_III.value, 0.25),
            FaseEscatologica.FASE_IV.value: hmm_dist.get(FaseEscatologica.FASE_IV.value, 0.25),
        }
        phase_scores[fase_llm] = phase_scores.get(fase_llm, 0) + 0.15
        fase_publicada = max(phase_scores, key=phase_scores.get)
        transicao = detect_phase_transition(phase_scores)
        confianca = min(1.0, indice_global * 0.6 + prob_hmm * 0.4)
        if transicao.transicao_entre_fases:
            confianca = round(confianca * (1 - transicao.margem_fases * 0.5), 4)

        result = {
            "indice_global": round(indice_global, 4),
            "fase": fase_publicada,
            "confianca": round(confianca, 4),
            "posterior_bayes": round(posterior, 4),
            "probabilidade_hmm": hmm_dist,
            "score_llm": round(score_llm, 4),
            "alerta_falso_lider": false_leader.alerta,
            "score_incongruencia": round(false_leader.score_incongruencia, 4),
            "score_besta_mar": round(beasts.besta_mar, 4),
            "score_besta_terra": round(beasts.besta_terra, 4),
            "justificativa": false_leader.mensagem,
            "metricas": metrics,
            "transicao_fase": transicao.to_dict(),
            "fase_scores_consolidados": {k: round(v, 4) for k, v in phase_scores.items()},
        }
        self.validator.validate("resultado_correlacao", result)
        return result
