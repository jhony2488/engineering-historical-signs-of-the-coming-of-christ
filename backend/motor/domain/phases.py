from enum import StrEnum


class FaseEscatologica(StrEnum):
    FASE_I = "FASE_I"
    FASE_II = "FASE_II"
    FASE_III = "FASE_III"
    FASE_IV = "FASE_IV"

    @property
    def index(self) -> int:
        return list(FaseEscatologica).index(self) + 1

    @property
    def label(self) -> str:
        labels = {
            "FASE_I": "O Início das Dores",
            "FASE_II": "A Grande Apostasia e o Cenário Global",
            "FASE_III": "A Manifestação e Tribulação",
            "FASE_IV": "A Convergência Final (Iminência)",
        }
        return labels[self.value]


def fase_from_index(index: int) -> FaseEscatologica:
    mapping = {
        1: FaseEscatologica.FASE_I,
        2: FaseEscatologica.FASE_II,
        3: FaseEscatologica.FASE_III,
        4: FaseEscatologica.FASE_IV,
    }
    return mapping[max(1, min(4, index))]
