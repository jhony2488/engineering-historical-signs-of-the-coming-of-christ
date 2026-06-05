from dataclasses import dataclass

from motor.config import get_settings


@dataclass
class FalseLeaderAlert:
    alerta: bool
    score_incongruencia: float
    score_expansao_discurso: float
    score_contracao_estrutura: float
    mensagem: str


def detect_false_leader(
    score_expansao_discurso: float,
    score_contracao_estrutura: float,
    threshold: float | None = None,
) -> FalseLeaderAlert:
    settings = get_settings()
    threshold = threshold or settings.false_leader_incongruence_threshold

    incongruencia = min(
        1.0,
        (score_expansao_discurso + score_contracao_estrutura) / 2
        if score_expansao_discurso > 0.5 and score_contracao_estrutura > 0.5
        else 0.0,
    )
    alerta = score_expansao_discurso >= threshold and score_contracao_estrutura >= threshold
    msg = (
        "Alerta: discurso de expansão espiritual com estrutura de contração simultânea."
        if alerta
        else "Sem alerta de falso líder neste ciclo."
    )
    return FalseLeaderAlert(
        alerta=alerta,
        score_incongruencia=incongruencia,
        score_expansao_discurso=score_expansao_discurso,
        score_contracao_estrutura=score_contracao_estrutura,
        mensagem=msg,
    )
