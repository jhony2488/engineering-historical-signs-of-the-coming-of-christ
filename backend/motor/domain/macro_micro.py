from enum import StrEnum


class Dimensao(StrEnum):
    MACRO = "macro"
    MICRO = "micro"


MACRO_KEYWORDS = [
    "geopolitica",
    "tratado",
    "onu",
    "g20",
    "oriente medio",
    "coalizao",
    "governanca global",
    "cbdc",
    "moeda digital",
    "vigilancia",
    "apostasia",
    "secularismo",
    "guerra",
    "fome",
    "terremoto",
    "peste",
]

MICRO_KEYWORDS = [
    "comunidade",
    "igreja local",
    "falso mestre",
    "discernimento",
    "santificacao",
    "resistencia",
    "fidelidade",
    "alerta",
    "perseguicao local",
]


def classify_dimension(text: str) -> Dimensao:
    lower = text.lower()
    macro = sum(1 for w in MACRO_KEYWORDS if w in lower)
    micro = sum(1 for w in MICRO_KEYWORDS if w in lower)
    return Dimensao.MACRO if macro >= micro else Dimensao.MICRO
