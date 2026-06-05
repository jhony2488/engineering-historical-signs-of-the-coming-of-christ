from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class CandidateScore:
    candidato_id: str
    nome: str
    personagem: str
    pap: float
    scores_criterio: dict[str, float]
    fator_principal: str


WEIGHTS_MAR = {
    "influencia_unificacao": 0.35,
    "carisma_global": 0.25,
    "divergencia_valores": 0.20,
    "centralizacao_estrutural": 0.20,
}

WEIGHTS_TERRA = {
    "validacao_lider": 0.40,
    "monopolio_narrativa": 0.30,
    "prodigios_tecnologicos": 0.30,
}


def _weighted_score(scores: dict[str, float], weights: dict[str, float]) -> float:
    total = 0.0
    for key, weight in weights.items():
        total += weight * scores.get(key, 0.0)
    return min(1.0, total)


def rank_candidates(
    candidates: list[dict[str, Any]],
    personagem: str,
    prior_pap: dict[str, float] | None = None,
    top_n: int = 10,
) -> list[CandidateScore]:
    weights = WEIGHTS_MAR if personagem == "besta_mar" else WEIGHTS_TERRA
    prior_pap = prior_pap or {}
    results: list[CandidateScore] = []

    for c in candidates:
        if c.get("personagem") != personagem:
            continue
        scores = c.get("scores_criterio", {})
        base = _weighted_score(scores, weights)
        prior = prior_pap.get(c["id"], 0.1)
        pap = (0.7 * base + 0.3 * prior) * 100
        top_key = max(scores, key=scores.get, default="influencia_unificacao")
        results.append(
            CandidateScore(
                candidato_id=c["id"],
                nome=c["nome"],
                personagem=personagem,
                pap=round(pap, 1),
                scores_criterio=scores,
                fator_principal=f"Destaque em {top_key}",
            )
        )

    results.sort(key=lambda x: x.pap, reverse=True)
    return results[:top_n]
