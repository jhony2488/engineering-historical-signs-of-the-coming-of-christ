from __future__ import annotations

from typing import Any

import structlog

from motor.config import get_settings
from motor.domain.apocalyptic_signals import (
    DECEPTION_KEYWORDS,
    PROPHECY_SIGNAL_KEYWORDS,
    UFO_DISCLOSURE_KEYWORDS,
)
from motor.domain.macro_micro import MACRO_KEYWORDS
from motor.ml.prototypes import EmbeddingZeroShot, load_prototypes

logger = structlog.get_logger()

_LEXICAL_SATURATION = 8.0


class RelevanceGate:
    """Gate de relevância antes da Camada 4 — ordena chunks por relevância
    escatológica (protótipos zero-shot via embeddings; fallback lexical).

    Sem gate, `extract_events` processa apenas os primeiros N chunks na ordem
    de ingestão; com gate, os N mais relevantes são extraídos primeiro.
    """

    def __init__(self, embeddings: Any | None = None) -> None:
        self.settings = get_settings()
        self.embeddings = embeddings
        self._zs = EmbeddingZeroShot(embeddings)
        self.model_used = "none"

    def _lexical_score(self, text: str) -> float:
        lower = text.lower()
        hits = sum(
            1
            for kws in PROPHECY_SIGNAL_KEYWORDS.values()
            for kw in kws
            if kw in lower
        )
        hits += sum(1 for kw in MACRO_KEYWORDS if kw in lower)
        hits += sum(1 for kw in UFO_DISCLOSURE_KEYWORDS if kw in lower)
        hits += sum(1 for kw in DECEPTION_KEYWORDS if kw in lower)
        return min(1.0, hits / _LEXICAL_SATURATION)

    def score(self, text: str) -> tuple[float, str]:
        protos = load_prototypes()
        pos = protos.get("relevance_positive") or []
        neg = protos.get("relevance_negative") or []
        if pos and neg:
            scores = self._zs.label_scores(text, {"pos": pos, "neg": neg})
            if scores is not None:
                s = max(0.0, min(1.0, 0.5 + (scores["pos"] - scores["neg"]) * 2))
                return s, self.settings.bge_model_name
        return self._lexical_score(text), "lexical_v1"

    def rank(self, chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Retorna chunks ordenados por relevância desc, com campo `relevancia`."""
        if not chunks:
            return chunks
        if not self.settings.relevance_gate_enabled:
            self.model_used = "disabled"
            return chunks
        model = "lexical_v1"
        ranked: list[dict[str, Any]] = []
        for c in chunks:
            s, model = self.score(str(c.get("texto", "")))
            ranked.append({**c, "relevancia": round(s, 4)})
        ranked.sort(key=lambda c: c["relevancia"], reverse=True)
        min_score = float(self.settings.relevance_min_score)
        if min_score > 0:
            ranked = [c for c in ranked if c["relevancia"] >= min_score]
        self.model_used = model
        logger.info(
            "relevance_gate_ranked",
            n_chunks=len(chunks),
            n_kept=len(ranked),
            model=model,
        )
        return ranked
