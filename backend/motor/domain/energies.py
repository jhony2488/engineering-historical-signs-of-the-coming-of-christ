from enum import StrEnum


class Energia(StrEnum):
    EXPANSAO = "expansao"
    CONTRACAO = "contracao"


EXPANSAO_INDICATORS = [
    "evangelho",
    "despertamento",
    "caridade",
    "unificacao",
    "fe",
    "esperanca",
    "discernimento",
    "sabedoria",
    "remanescente",
]

CONTRACAO_INDICATORS = [
    "perseguicao",
    "engano",
    "totalitarismo",
    "conflito",
    "catástrofe",
    "apostasia",
    "vigilancia",
    "cbdc",
    "identidade digital",
    "controle",
]


def classify_energy_heuristic(text: str) -> Energia:
    lower = text.lower()
    exp = sum(1 for w in EXPANSAO_INDICATORS if w in lower)
    con = sum(1 for w in CONTRACAO_INDICATORS if w in lower)
    return Energia.EXPANSAO if exp >= con else Energia.CONTRACAO
