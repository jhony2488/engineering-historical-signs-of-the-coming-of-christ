from __future__ import annotations

import json
from typing import Any

import numpy as np
import structlog

from motor.config import CONFIG_DIR, get_settings

logger = structlog.get_logger()


class EmbeddingService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._model = None
        self._corpus: list[dict[str, str]] = self._load_corpus()

    def _load_corpus(self) -> list[dict[str, str]]:
        path = CONFIG_DIR / "corpus_teologico_seed.json"
        with path.open(encoding="utf-8") as f:
            return json.load(f)

    def _get_model(self):
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer

                self._model = SentenceTransformer(self.settings.bge_model_name)
            except Exception as exc:
                logger.warning("embedding_model_unavailable", error=str(exc))
                self._model = False
        return self._model if self._model is not False else None

    @property
    def is_available(self) -> bool:
        """True se o modelo de embedding real carregou (sem ele, embed_texts usa
        fallback de hash determinístico — inválido para similaridade semântica)."""
        return self._get_model() is not None

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        model = self._get_model()
        if model is None:
            logger.warning("embedding_hash_fallback_active", n=len(texts))
            return [self._hash_embedding(t) for t in texts]
        vectors = model.encode(
            texts,
            batch_size=self.settings.embedding_batch_size,
            normalize_embeddings=True,
        )
        return [v.tolist() for v in vectors]

    def _hash_embedding(self, text: str, dim: int = 1024) -> list[float]:
        rng = np.random.default_rng(abs(hash(text)) % (2**32))
        vec = rng.standard_normal(dim)
        vec = vec / np.linalg.norm(vec)
        return vec.tolist()

    def rag_teologico(self, query: str, top_k: int = 3, db=None) -> list[dict[str, str]]:
        if db is None:
            from motor.adapters.postgres import get_postgres

            db = get_postgres()

        candidates: list[dict[str, str]] = []
        if db.is_configured:
            try:
                vec = self.embed_texts([query])[0]
                rows = db.rpc(
                    "match_documents",
                    {
                        "query_embedding": vec,
                        "match_count": top_k * self.settings.reranker_candidate_multiplier,
                    },
                )
                if rows:
                    candidates = [
                        {
                            "referencia": r["referencia"],
                            "texto": r["texto"],
                            "tema": r.get("tema", ""),
                        }
                        for r in rows
                    ]
            except Exception as exc:
                logger.warning("rag_pgvector_fallback", error=str(exc))

        if not candidates and self._corpus:
            query_vec = np.array(self.embed_texts([query])[0])
            scored = []
            for item in self._corpus:
                item_vec = np.array(self.embed_texts([item["texto"]])[0])
                score = float(np.dot(query_vec, item_vec))
                scored.append((score, item))
            scored.sort(key=lambda x: x[0], reverse=True)
            candidates = [
                item for _, item in scored[: top_k * self.settings.reranker_candidate_multiplier]
            ]

        if not candidates:
            return []
        if len(candidates) > top_k:
            reranked = self._rerank(query, candidates)
            if reranked is not None:
                candidates = reranked
        return candidates[:top_k]

    def _rerank(self, query: str, candidates: list[dict[str, str]]) -> list[dict[str, str]] | None:
        """Cross-encoder rerank (camada 3) — degrada para ordem de cosseno se indisponível."""
        from motor.ml.reranker import BgeReranker

        scores = BgeReranker().score_pairs([(query, c["texto"]) for c in candidates])
        if scores is None:
            return None
        ranked = sorted(
            zip(scores, candidates, strict=True), key=lambda x: x[0], reverse=True
        )
        return [c for _, c in ranked]

    def persist(self, db, trecho_id: str, texto: str) -> dict[str, Any]:
        vector = self.embed_texts([texto])[0]
        return db.insert(
            "embeddings_eventos",
            {"trecho_id": trecho_id, "embedding": vector, "modelo": self.settings.bge_model_name},
        )

    def seed_corpus(self, db) -> None:
        for item in self._corpus:
            vec = self.embed_texts([item["texto"]])[0]
            db.upsert(
                "corpus_teologico",
                {
                    "referencia": item["referencia"],
                    "texto": item["texto"],
                    "tema": item["tema"],
                    "embedding": vec,
                },
                on_conflict="referencia",
            )
