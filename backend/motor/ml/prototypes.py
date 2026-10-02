from __future__ import annotations

import json
from typing import Any

import numpy as np
import structlog

from motor.config import CONFIG_DIR

logger = structlog.get_logger()

_PROTOTYPES_PATH = CONFIG_DIR / "classifier_prototypes.json"


def load_prototypes() -> dict[str, Any]:
    if not _PROTOTYPES_PATH.exists():
        return {}
    with _PROTOTYPES_PATH.open(encoding="utf-8") as f:
        return json.load(f)


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    na, nb = np.linalg.norm(a), np.linalg.norm(b)
    if na < 1e-9 or nb < 1e-9:
        return 0.0
    return float(np.dot(a, b) / (na * nb))


class EmbeddingZeroShot:
    """Classificação zero-shot: cosseno do texto contra descrições de rótulos.

    Reusa o EmbeddingService (BGE-M3). Sem modelo real, `available=False` e
    os callers degradam para heurísticas lexicais.
    """

    def __init__(self, embeddings: Any | None) -> None:
        self.embeddings = embeddings
        self._proto_cache: dict[str, np.ndarray] = {}

    @property
    def available(self) -> bool:
        return self.embeddings is not None and self.embeddings.is_available

    def _embed(self, texts: list[str]) -> list[np.ndarray] | None:
        if not self.available:
            return None
        try:
            return [
                np.array(v, dtype=float)
                for v in self.embeddings.embed_texts([t[:2000] for t in texts])
            ]
        except Exception as exc:
            logger.warning("zeroshot_embed_failed", error=str(exc))
            return None

    def label_scores(
        self, text: str, labels: dict[str, list[str] | str]
    ) -> dict[str, float] | None:
        """Score 0-1 por rótulo = melhor cosseno texto↔descrições do rótulo."""
        protos = sorted(
            {
                p
                for ps in labels.values()
                for p in (ps if isinstance(ps, list) else [ps])
            }
        )
        missing = [p for p in protos if p not in self._proto_cache]
        if missing:
            vecs = self._embed(missing)
            if vecs is None:
                return None
            for p, v in zip(missing, vecs, strict=True):
                self._proto_cache[p] = v
        text_vec = self._embed([text])
        if text_vec is None:
            return None
        tv = text_vec[0]
        out: dict[str, float] = {}
        for label, ps in labels.items():
            ps = ps if isinstance(ps, list) else [ps]
            out[label] = max(0.0, max(cosine(tv, self._proto_cache[p]) for p in ps))
        return out
