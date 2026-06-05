"""Testes unitários de rankings e tendencia_24h no orchestrator."""

from datetime import date

from motor.pipeline.orchestrator import DailyOrchestrator
from tests.conftest import FakeSupabase


def test_build_rankings_top10_mar_terra(ref_date: date):
    db = FakeSupabase()
    orch = DailyOrchestrator(db=db)
    mar, terra = orch._build_rankings(ref_date)

    assert len(mar) == 10
    assert len(terra) == 10
    assert mar[0]["posicao"] == 1
    assert mar[0]["probabilidade_atual"] >= mar[-1]["probabilidade_atual"]
    assert all(e["personagem"] == "besta_mar" for e in mar)
    assert all(e["personagem"] == "besta_terra" for e in terra)
    assert len(db.inserts) == 20


def test_tendencia_24h_from_yesterday_pap(ref_date: date):
    prior = ref_date.fromordinal(ref_date.toordinal() - 1)
    rankings = {
        ("besta_mar", prior): [
            {
                "candidato_id": "cand-mar-001",
                "probabilidade_atual": 60.0,
            },
        ],
        ("besta_terra", prior): [],
    }
    db = FakeSupabase(rankings=rankings)
    orch = DailyOrchestrator(db=db)
    mar, _ = orch._build_rankings(ref_date)

    top = next(r for r in mar if r["candidato_id"] == "cand-mar-001")
    assert top["tendencia_24h"] == round(top["probabilidade_atual"] - 60.0, 1)


def test_tendencia_zero_without_yesterday(ref_date: date):
    db = FakeSupabase()
    orch = DailyOrchestrator(db=db)
    mar, _ = orch._build_rankings(ref_date)
    assert all(r["tendencia_24h"] == 0.0 for r in mar)


def test_load_yesterday_pap_merges_personagens(ref_date: date):
    prior = ref_date.fromordinal(ref_date.toordinal() - 1)
    rankings = {
        ("besta_mar", prior): [{"candidato_id": "cand-mar-001", "probabilidade_atual": 70}],
        ("besta_terra", prior): [{"candidato_id": "cand-terra-001", "probabilidade_atual": 65}],
    }
    db = FakeSupabase(rankings=rankings)
    orch = DailyOrchestrator(db=db)
    pap = orch._load_yesterday_pap(ref_date)
    assert pap["cand-mar-001"] == 70
    assert pap["cand-terra-001"] == 65
