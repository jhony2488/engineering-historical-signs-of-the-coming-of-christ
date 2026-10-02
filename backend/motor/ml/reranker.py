from __future__ import annotations

import math

import structlog

from motor.config import get_settings

logger = structlog.get_logger()


class BgeReranker:
    """Cross-encoder local (BGE reranker) — lazy load, CPU-only, degradável.

    Usado para reranquear candidatos do RAG teológico e para o match
    evento↔profecia no FulfillmentTracker. Scores são logits; use
    `sigmoid` para projetar em 0-1 quando for misturar com scores bounded.
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self._model = None

    def _get(self):
        if self._model is None:
            if not self.settings.reranker_enabled:
                self._model = False
            else:
                try:
                    from sentence_transformers import CrossEncoder

                    self._model = CrossEncoder(self.settings.reranker_model_name)
                except Exception as exc:
                    logger.warning("reranker_unavailable", error=str(exc))
                    self._model = False
        return self._model if self._model is not False else None

    @property
    def is_available(self) -> bool:
        return self._get() is not None

    def score_pairs(self, pairs: list[tuple[str, str]]) -> list[float] | None:
        model = self._get()
        if model is None or not pairs:
            return None
        try:
            scores = model.predict(pairs)
            return [float(s) for s in scores]
        except Exception as exc:
            logger.warning("reranker_predict_failed", error=str(exc))
            return None

    @staticmethod
    def sigmoid(x: float) -> float:
        return 1.0 / (1.0 + math.exp(-x))
