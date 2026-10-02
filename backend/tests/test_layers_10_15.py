from datetime import date

from motor.pipeline.abm_simulation import AbmSimulationService
from motor.pipeline.adaptive_recommendations import AdaptiveRecommendationService
from motor.pipeline.adversarial_validation import AdversarialValidationService
from motor.pipeline.historical_echo import HistoricalEchoService
from motor.pipeline.provenance import ProvenanceService, merkle_root, sha256_payload
from motor.pipeline.threat_analysis import ThreatAnalysisService

EVENTS = [
    {
        "evento": "conflito_militar",
        "regiao": "oriente_medio",
        "grau_tensao": 0.85,
        "impacto_global": 0.7,
        "descricao": "guerra e cerco comercial",
    },
    {
        "evento": "cbdc_expansao",
        "regiao": "global",
        "grau_tensao": 0.55,
        "impacto_global": 0.68,
        "descricao": "banco central cbdc controle",
    },
    {
        "evento": "perseguicao_religiosa",
        "regiao": "asia_pacifico",
        "grau_tensao": 0.7,
        "impacto_global": 0.5,
        "descricao": "igreja sob censura e vigilancia",
    },
]

CORRELACAO = {
    "fase": "FASE_II",
    "justificativa": "tensao geopolitica e falso lider",
    "alerta_falso_lider": True,
    "score_incongruencia": 0.74,
}


def test_historical_echo_returns_matches():
    matches = HistoricalEchoService().match_for_events(EVENTS, CORRELACAO, top_k=2)
    # Servico garante pelo menos 3 analogos quando ha seed suficiente
    assert len(matches) >= 2
    assert matches[0]["similarity_percentage"] >= matches[-1]["similarity_percentage"]
    assert "pattern_phase" in matches[0]


def test_threat_analysis_scores_focus_countries():
    echoes = HistoricalEchoService().match_by_country(
        ThreatAnalysisService().countries, EVENTS, CORRELACAO
    )
    threats = ThreatAnalysisService().analyze(EVENTS, CORRELACAO, echoes_by_country=echoes)
    assert len(threats) >= 10
    assert all(0 <= t["risk_score"] <= 1 for t in threats)
    assert threats[0]["risk_score"] >= threats[-1]["risk_score"]
    assert "prescriptions" in threats[0]
    assert set(threats[0]["prescriptions"]) >= {"physical", "financial", "spiritual"}


def test_abm_monte_carlo_outputs():
    threats = ThreatAnalysisService().analyze(EVENTS, CORRELACAO)
    top = threats[:3]
    sims = AbmSimulationService(runs=20, horizon_months=12).simulate_all(top)
    assert len(sims) == 3
    for s in sims:
        assert s["runs"] == 20
        assert 0 <= s["fragility_index"] <= 1
        probs = s["probabilistic_outcomes"]
        assert abs(sum(probs.values()) - 1.0) < 1e-6


def test_adversarial_top5_dry_run():
    import asyncio

    threats = ThreatAnalysisService().analyze(EVENTS, CORRELACAO)
    reviews = asyncio.run(
        AdversarialValidationService(top_n=5).review_top(threats, EVENTS, CORRELACAO)
    )
    assert len(reviews) == 5
    assert all(0 <= r["resilience_score"] <= 1 for r in reviews)
    assert "fragile_premises" in reviews[0]


def test_provenance_chain_and_merkle():
    svc = ProvenanceService(db=None)
    ref = date(2026, 8, 5)
    svc.seal_stage(ref, "ingestion", {"n": 1})
    svc.seal_stage(ref, "extraction", EVENTS)
    final = svc.finalize_day(ref, {"ok": True})
    assert final["integrity_ok"] is True
    assert final["merkle_root"]
    assert len(final["merkle_root"]) == 64
    assert sha256_payload({"a": 1}) != sha256_payload({"a": 2})
    assert merkle_root(["aa", "bb"]) == merkle_root(["aa", "bb"])


def test_adaptive_recommendations_urgency():
    threats = ThreatAnalysisService().analyze(EVENTS, CORRELACAO)
    abm = AbmSimulationService(runs=15, horizon_months=12).simulate_all(threats[:5])
    adv = [
        {"country_code": threats[0]["country_code"], "resilience_score": 0.3},
    ]
    recs = AdaptiveRecommendationService().build(
        threats[:5],
        abm,
        adv,
        {"integrity_ok": True},
    )
    assert recs
    assert any(r["urgency"] == "condicional" for r in recs)
    assert all("triggers" in r and "actions" in r for r in recs)


def test_l15_conditional_when_integrity_fails():
    threats = ThreatAnalysisService().analyze(EVENTS, CORRELACAO)[:3]
    recs = AdaptiveRecommendationService().build(
        threats,
        [],
        [{"country_code": threats[0]["country_code"], "resilience_score": 0.9}],
        {"integrity_ok": False},
    )
    assert recs
    assert all(r["urgency"] == "condicional" for r in recs)
    assert all(r.get("payload", {}).get("conditional_reason") == "integridade_l14" for r in recs)


def test_joshua_enriches_religious_freedom():
    from motor.pipeline.joshua_analysis import JoshuaAnalysisService

    base = ThreatAnalysisService().analyze(EVENTS, CORRELACAO)
    josh_rows = [
        {
            "people_id": "x",
            "country_code": base[0]["country_code"],
            "joshua_scale": 1,
            "bible_translation_status": "NONE",
            "percent_evangelical": 0.1,
            "percent_christian": 0.5,
        }
    ]
    agg = JoshuaAnalysisService().country_aggregates(josh_rows)
    enriched = ThreatAnalysisService().analyze(
        EVENTS, CORRELACAO, joshua_by_country=agg
    )
    code = base[0]["country_code"]
    before = next(t for t in base if t["country_code"] == code)
    after = next(t for t in enriched if t["country_code"] == code)
    assert after["metrics"]["religious_freedom_threat"] >= before["metrics"][
        "religious_freedom_threat"
    ]


def test_abm_synthesis_heuristic_and_dry_run_skip_llm(monkeypatch):
    monkeypatch.setenv("LLM_DRY_RUN", "true")
    from motor.config import get_settings

    get_settings.cache_clear()
    svc = AbmSimulationService(runs=12, horizon_months=12)
    threat = {
        "country_code": "BRA",
        "risk_score": 0.62,
        "metrics": {
            "juridical_instability": 0.5,
            "financial_control_level": 0.55,
            "religious_freedom_threat": 0.4,
        },
    }
    row = svc.simulate_country(threat)
    assert "synthesis" in row
    assert row["synthesis"]["source"] == "heuristic"
    assert "Em um espaço de possibilidades" in row["synthesis"]["synthesis"]

    import asyncio

    out = asyncio.run(svc.enrich_synthesis_llm(row, router=object()))
    assert out["synthesis"]["source"] == "heuristic"
    get_settings.cache_clear()
