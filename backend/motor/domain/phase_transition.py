from __future__ import annotations

from dataclasses import dataclass

from motor.config import get_settings
from motor.domain.phases import FaseEscatologica


@dataclass
class PhaseTransitionResult:
    transicao_entre_fases: bool
    fase_dominante: str
    fase_secundaria: str
    margem_fases: float
    proximidade_secundaria: float
    pontuacao_dominante: float
    pontuacao_secundaria: float
    descricao: str

    def to_dict(self) -> dict:
        return {
            "transicao_entre_fases": self.transicao_entre_fases,
            "fase_dominante": self.fase_dominante,
            "fase_secundaria": self.fase_secundaria,
            "margem_fases": self.margem_fases,
            "proximidade_secundaria": self.proximidade_secundaria,
            "pontuacao_dominante": self.pontuacao_dominante,
            "pontuacao_secundaria": self.pontuacao_secundaria,
            "descricao": self.descricao,
        }


def _fase_index(fase_id: str) -> int:
    return FaseEscatologica(fase_id).index


def _label(fase_id: str) -> str:
    return FaseEscatologica(fase_id).label


def detect_phase_transition(
    phase_scores: dict[str, float],
    margin_max: float | None = None,
    proximity_min: float = 0.72,
) -> PhaseTransitionResult:
    """
    Detecta zona de transição quando duas fases adjacentes competem com scores próximos.

    Critérios:
    - As duas fases mais prováveis são adjacentes na linha do tempo (I↔II, II↔III, III↔IV)
    - A margem entre 1ª e 2ª é menor ou igual a margin_max (default 0.15)
    - A fase secundária atinge pelo menos proximity_min da pontuação da dominante
    """
    settings = get_settings()
    margin_max = margin_max if margin_max is not None else settings.phase_transition_margin_max

    if not phase_scores:
        return PhaseTransitionResult(
            transicao_entre_fases=False,
            fase_dominante=FaseEscatologica.FASE_I.value,
            fase_secundaria=FaseEscatologica.FASE_II.value,
            margem_fases=1.0,
            proximidade_secundaria=0.0,
            pontuacao_dominante=0.25,
            pontuacao_secundaria=0.25,
            descricao="Distribuição de fases insuficiente para análise de transição.",
        )

    ranked = sorted(phase_scores.items(), key=lambda x: x[1], reverse=True)
    dominante, score_dom = ranked[0]
    secundaria, score_sec = ranked[1] if len(ranked) > 1 else (dominante, 0.0)

    margem = score_dom - score_sec
    proximidade = score_sec / score_dom if score_dom > 0 else 0.0
    adjacentes = abs(_fase_index(dominante) - _fase_index(secundaria)) == 1

    em_transicao = (
        adjacentes and margem <= margin_max and proximidade >= proximity_min and score_sec > 0
    )

    if em_transicao:
        descricao = (
            f"Zona de transição detectada entre {_label(dominante)} e {_label(secundaria)}. "
            f"Margem de apenas {margem * 100:.1f}% — os sinais convergem para ambas as fases "
            f"simultaneamente, indicando deslocamento gradual entre eras."
        )
    else:
        descricao = (
            f"Dominância clara de {_label(dominante)} "
            f"({score_dom * 100:.1f}% vs {score_sec * 100:.1f}% da próxima fase)."
        )

    return PhaseTransitionResult(
        transicao_entre_fases=em_transicao,
        fase_dominante=dominante,
        fase_secundaria=secundaria,
        margem_fases=round(margem, 4),
        proximidade_secundaria=round(proximidade, 4),
        pontuacao_dominante=round(score_dom, 4),
        pontuacao_secundaria=round(score_sec, 4),
        descricao=descricao,
    )
