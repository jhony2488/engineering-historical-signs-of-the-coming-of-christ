"""Destilação da camada 4: export de dataset e LocalEventExtractor."""

from __future__ import annotations

import json
from pathlib import Path

from motor.ml.distill import ExtractionDatasetExporter, LocalEventExtractor
from motor.pipeline.embeddings.service import EmbeddingService
from motor.pipeline.llm.layers import LLMPipeline

from .conftest import FakeSupabase


def _db_with_pairs(n: int) -> FakeSupabase:
    trechos = [{"id": f"t{i}", "texto": f"texto do trecho {i} sobre conflito"} for i in range(n)]
    eventos = [
        {
            "id": f"e{i}",
            "trecho_id": f"t{i}",
            "dados": {
                "evento": "conflito_militar",
                "regiao": "oriente_medio",
                "energia": "contracao",
                "dimensao": "macro",
                "grau_tensao": 0.7,
                "impacto_global": 0.6,
            },
        }
        for i in range(n)
    ]
    return FakeSupabase(
        tables={"trechos_processados": trechos, "eventos_estruturados": eventos}
    )


def test_export_refuses_below_min_rows(tmp_path: Path) -> None:
    exporter = ExtractionDatasetExporter(_db_with_pairs(2))
    result = exporter.export(tmp_path / "ds.jsonl", min_rows=10)
    assert result["ok"] is False
    assert result["n_rows"] == 2


def test_export_writes_jsonl(tmp_path: Path) -> None:
    exporter = ExtractionDatasetExporter(_db_with_pairs(3))
    out = tmp_path / "ds.jsonl"
    result = exporter.export(out, min_rows=3)
    assert result["ok"] is True
    lines = out.read_text(encoding="utf-8").splitlines()
    assert len(lines) == 3
    row = json.loads(lines[0])
    assert row["evento"] == "conflito_militar"
    assert "texto" in row


def test_export_skips_orphans(tmp_path: Path) -> None:
    db = _db_with_pairs(1)
    db.tables["eventos_estruturados"].append(
        {"id": "e-orphan", "trecho_id": "missing", "dados": {"evento": "x"}}
    )
    exporter = ExtractionDatasetExporter(db)
    result = exporter.export(tmp_path / "ds.jsonl", min_rows=1)
    assert result["ok"] is True
    assert result["n_rows"] == 1


def test_local_extractor_unavailable_without_artifacts(
    tmp_path: Path, monkeypatch
) -> None:
    monkeypatch.setattr(EmbeddingService, "_get_model", lambda self: None)
    ext = LocalEventExtractor(embeddings=None, model_dir=tmp_path / "empty")
    assert ext.available is False
    assert ext.extract("texto qualquer") is None


def test_local_extract_disabled_by_default(monkeypatch) -> None:
    pipeline = LLMPipeline(embeddings=None)
    assert pipeline._local_extract("texto") is None


def test_local_extract_classifier_first_without_artifacts(monkeypatch) -> None:
    monkeypatch.setenv("EXTRACTION_MODE", "classifier_first")
    from motor.config import get_settings

    get_settings.cache_clear()
    try:
        monkeypatch.setattr(EmbeddingService, "_get_model", lambda self: None)
        pipeline = LLMPipeline(embeddings=None)
        assert pipeline._local_extract("texto") is None
    finally:
        monkeypatch.delenv("EXTRACTION_MODE", raising=False)
        get_settings.cache_clear()
