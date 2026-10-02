"""Dedup semântico por embedding na ingestão (camada 1)."""

from __future__ import annotations

from motor.pipeline.embeddings.service import EmbeddingService
from motor.pipeline.ingestion.collector import IngestionCollector, RawDocument


def _doc(titulo: str, conteudo: str) -> RawDocument:
    return RawDocument(
        titulo=titulo, conteudo=conteudo, fonte="test", url="", categoria="t"
    )


def test_semantic_dedup_no_model_returns_input(monkeypatch) -> None:
    monkeypatch.setattr(EmbeddingService, "_get_model", lambda self: None)
    docs = [_doc("a", "conteudo aaa"), _doc("b", "conteudo bbb")]
    collector = IngestionCollector()
    assert collector._semantic_dedup(docs) == docs


def test_semantic_dedup_drops_near_duplicate(monkeypatch) -> None:
    monkeypatch.setattr(EmbeddingService, "_get_model", lambda self: object())

    def fake_embed(self, texts):
        out = []
        for t in texts:
            if "aaa" in t:
                out.append([1.0] + [0.0] * 1023)
            else:
                out.append([0.0, 1.0] + [0.0] * 1022)
        return out

    monkeypatch.setattr(EmbeddingService, "embed_texts", fake_embed)

    docs = [
        _doc("a1", "texto aaa versao um"),
        _doc("a2", "texto aaa versao dois"),
        _doc("b1", "texto bbb diferente"),
    ]
    collector = IngestionCollector()
    kept = collector._semantic_dedup(docs)
    assert [d.titulo for d in kept] == ["a1", "b1"]
