from datetime import date

from motor.pipeline.adaptive_recommendations import AdaptiveRecommendationService
from motor.pipeline.joshua_analysis import JoshuaAnalysisService
from motor.pipeline.provenance import ProvenanceService


def test_joshua_analyze_unreached():
    row = {
        "people_id": "PG_1",
        "country_code": "AFG",
        "joshua_scale": 1,
        "bible_translation_status": "NONE",
        "percent_evangelical": 0.01,
        "percent_christian": 0.02,
        "jesus_film_available": False,
        "audio_recordings_available": False,
    }
    out = JoshuaAnalysisService().analyze_row(row)
    assert out["contraction_score"] > out["expansion_score"]
    assert out["missiological_risk"] >= 0.4
    assert out["inferred_phase"]


def test_joshua_country_aggregates():
    rows = [
        {
            "people_id": "a",
            "country_code": "BRA",
            "joshua_scale": 3,
            "bible_translation_status": "PORTIONS",
            "percent_christian": 20,
            "percent_evangelical": 5,
        },
        {
            "people_id": "b",
            "country_code": "BRA",
            "joshua_scale": 4,
            "bible_translation_status": "COMPLETE",
            "percent_christian": 40,
            "percent_evangelical": 15,
        },
    ]
    agg = JoshuaAnalysisService().country_aggregates(rows)
    assert "BRA" in agg
    assert agg["BRA"]["peoples_count"] == 2


def test_l15_conditional_on_integrity_fail():
    threats = [
        {
            "country_code": "BRA",
            "risk_score": 0.8,
            "metrics": {
                "juridical_instability": 0.8,
                "financial_control_level": 0.7,
                "religious_freedom_threat": 0.7,
                "conflict_intensity": 0.5,
            },
            "prescriptions": {
                "physical": ["Ação física"],
                "financial": ["Ação financeira"],
                "spiritual": ["Ação espiritual"],
            },
        }
    ]
    recs = AdaptiveRecommendationService().build(
        threats,
        [],
        [{"country_code": "BRA", "resilience_score": 0.9}],
        {"integrity_ok": False},
    )
    assert recs
    assert recs[0]["urgency"] == "condicional"
    assert "emergência" in " ".join(recs[0]["actions"]).lower() or "gatilho" in " ".join(
        recs[0]["actions"]
    ).lower()


def test_provenance_verify_chain_ok():
    svc = ProvenanceService(db=None)
    ref = date(2026, 8, 6)
    svc.seal_stage(ref, "ingestion", {"n": 1})
    svc.seal_stage(ref, "extraction", [{"e": 1}])
    check = svc.verify_chain(svc.entries)
    assert check["ok"] is True
