"""Testes do Motor Nível 2 — síntese periódica."""

import pytest

from motor.pipeline.synthesis import WINDOW_META, SynthesisEngine
from tests.conftest import FakeSupabase


def test_window_meta_covers_doc_janelas():
    assert "weekly" in WINDOW_META
    assert "semiannual" in WINDOW_META
    assert WINDOW_META["monthly"]["days"] == 30


def test_build_delta_empty_historico():
    engine = SynthesisEngine(db=FakeSupabase(historico=[]))
    result = engine.build_delta("weekly")
    assert result["count"] == 0
    assert result["delta"] == {}


def test_build_delta_computes_variation(historico_mock_rows):
    engine = SynthesisEngine(db=FakeSupabase(historico=historico_mock_rows))
    result = engine.build_delta("weekly")
    assert result["motor"] == "nivel_2"
    assert result["count"] == 7
    delta = result["delta"]
    assert delta["fase_inicio"] == "FASE_I"
    assert delta["fase_fim"] == "FASE_II"
    assert delta["variacao_indice"] > 0
    assert result["periodo"]["inicio"] <= result["periodo"]["fim"]


@pytest.mark.asyncio
async def test_synthesis_run_dry_run(llm_dry_run, historico_mock_rows):
    engine = SynthesisEngine(db=FakeSupabase(historico=historico_mock_rows))
    result = await engine.run("monthly")
    assert result["motor"] == "nivel_2"
    assert "analise_ia" in result
    analise = result["analise_ia"]
    assert (
        "resumo" in analise
        or "padroes" in analise
        or "raciocinio" in analise
        or "fase_sugerida" in analise
    )
