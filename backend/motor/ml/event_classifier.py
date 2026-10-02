from __future__ import annotations

from typing import Any

import structlog

from motor.config import get_settings
from motor.domain.macro_micro import classify_dimension
from motor.ml.prototypes import EmbeddingZeroShot, load_prototypes
from motor.ml.spiritual_tone_classifier import classify_spiritual_tone

logger = structlog.get_logger()


def _top_label(scores: dict[str, float]) -> tuple[str, float]:
    ordered = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    if not ordered:
        return "", 0.0
    top = ordered[0]
    margin = top[1] - (ordered[1][1] if len(ordered) > 1 else 0.0)
    return top[0], round(margin, 4)


class EventShadowClassifier:
    """Classificador local dos campos estruturados da Camada 4.

    Em shadow mode (event_shadow_enabled), roda em paralelo ao LLM e a
    concordância/discordância vai para audit_log — insumo para decidir quando
    a extração pode ser destilada (extraction_mode=classifier_first).
    """

    def __init__(self, embeddings: Any | None = None) -> None:
        self.settings = get_settings()
        self._zs = EmbeddingZeroShot(embeddings)

    def _energia(self, text: str) -> dict[str, Any]:
        out = classify_spiritual_tone(text)
        conf = abs(out["expansao_score"] - out["contracao_score"])
        return {"valor": out["energia"], "confianca": round(conf, 4), "modelo": out["modelo"]}

    def _dimensao(self, text: str, protos: dict[str, Any]) -> dict[str, Any]:
        labels = protos.get("dimensao") or {}
        if labels:
            scores = self._zs.label_scores(text, {k: [v] for k, v in labels.items()})
            if scores:
                best, margin = _top_label(scores)
                return {"valor": best, "confianca": margin, "modelo": "bge_zeroshot"}
        d = classify_dimension(text)
        return {"valor": d.value, "confianca": 0.5, "modelo": "macro_micro_keywords"}

    def _evento(self, text: str, protos: dict[str, Any]) -> dict[str, Any]:
        labels = protos.get("evento") or {}
        if labels:
            scores = self._zs.label_scores(text, {k: [v] for k, v in labels.items()})
            if scores:
                best, margin = _top_label(scores)
                return {"valor": best, "confianca": margin, "modelo": "bge_zeroshot"}
        return {"valor": None, "confianca": 0.0, "modelo": "unavailable"}

    def _topico(self, text: str, protos: dict[str, Any]) -> dict[str, Any]:
        labels = protos.get("topico") or {}
        if labels:
            scores = self._zs.label_scores(text, {k: [v] for k, v in labels.items()})
            if scores:
                best, margin = _top_label(scores)
                return {"valor": best, "confianca": margin, "modelo": "bge_zeroshot"}
        return {"valor": None, "confianca": 0.0, "modelo": "unavailable"}

    def classify(self, text: str) -> dict[str, Any]:
        protos = load_prototypes()
        return {
            "energia": self._energia(text),
            "dimensao": self._dimensao(text, protos),
            "evento": self._evento(text, protos),
            "topico": self._topico(text, protos),
        }
