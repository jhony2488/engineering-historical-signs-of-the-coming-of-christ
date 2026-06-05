from dataclasses import dataclass


@dataclass
class BeastScores:
    besta_mar: float
    besta_terra: float


def compute_beast_scores(
    centralizacao_geopolitica: float,
    controle_subsistencia: float,
    validacao_lider: float,
    monopolio_narrativa: float,
    prodigios_tecnologicos: float,
) -> BeastScores:
    mar = (
        0.4 * centralizacao_geopolitica
        + 0.35 * controle_subsistencia
        + 0.25 * (1.0 - abs(centralizacao_geopolitica - controle_subsistencia))
    )
    terra = 0.4 * validacao_lider + 0.3 * monopolio_narrativa + 0.3 * prodigios_tecnologicos
    return BeastScores(besta_mar=min(1.0, mar), besta_terra=min(1.0, terra))
