from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class SpiritualProximity:
    """Medidor de Proximidade Espiritual — convergência Macro∩Micro x Expansão∩Contração."""

    score: float
    convergencia_dimensao: float
    convergencia_energia: float
    saturacao_sinais: float
    descricao: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "proximidade_espiritual": round(self.score, 4),
            "convergencia_dimensao": round(self.convergencia_dimensao, 4),
            "convergencia_energia": round(self.convergencia_energia, 4),
            "saturacao_sinais": round(self.saturacao_sinais, 4),
            "descricao": self.descricao,
        }


def compute_spiritual_proximity(
    macro_ratio: float,
    expansao_ratio: float,
    avg_tension: float = 0.5,
    avg_impact: float = 0.5,
    score_incongruencia: float = 0.0,
) -> SpiritualProximity:
    """
    Quanto mais Macro e Micro coexistem E Expansão e Contração coexistem
    (alinhamento simultâneo com profecias de luz e sombra), maior a proximidade.

    - convergencia_dimensao: pico quando macro≈micro (ambos ativos)
    - convergencia_energia: pico quando expansão≈contração (ambos ativos)
    - saturacao_sinais: tensão x impacto + peso leve de incongruência (falso líder)
    """
    macro = max(0.0, min(1.0, macro_ratio))
    micro = 1.0 - macro
    dim_conv = 2.0 * min(macro, micro)  # 1.0 em equilíbrio 50/50

    expansao = max(0.0, min(1.0, expansao_ratio))
    contracao = 1.0 - expansao
    energy_conv = 2.0 * min(expansao, contracao)

    tension = max(0.0, min(1.0, avg_tension))
    impact = max(0.0, min(1.0, avg_impact))
    incongruencia = max(0.0, min(1.0, score_incongruencia))
    saturacao = min(1.0, 0.55 * tension + 0.35 * impact + 0.10 * incongruencia)

    # Visão: convergência dual (dimensão x energia) + saturação de sinais
    score = min(
        1.0,
        0.35 * dim_conv + 0.35 * energy_conv + 0.30 * saturacao,
    )

    if score >= 0.75:
        desc = "Alta convergência Macro/Micro e Expansão/Contração — proximidade elevada."
    elif score >= 0.5:
        desc = "Convergência parcial entre camadas e energias — transição em curso."
    elif score >= 0.3:
        desc = "Sinais assimétricos; uma dimensão ou energia domina o quadro."
    else:
        desc = "Baixa convergência; padrões esparsos ou concentrados em um único eixo."

    return SpiritualProximity(
        score=score,
        convergencia_dimensao=dim_conv,
        convergencia_energia=energy_conv,
        saturacao_sinais=saturacao,
        descricao=desc,
    )
