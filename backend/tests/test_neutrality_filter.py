from motor.pipeline.neutrality_filter import scrub_narrative, scrub_payload_narratives


def test_scrub_narrative_removes_biased_labels():
    raw = "O líder tirânico de direita impôs um regime opressor e apocalíptico."
    out = scrub_narrative(raw)
    assert "tirânico" not in out["text"].lower()
    assert "de direita" not in out["text"].lower()
    assert "opressor" not in out["text"].lower()
    assert "apocalíptico" not in out["text"].lower()
    assert len(out["flags"]) > 0


def test_scrub_payload_preserves_scores():
    payload = {
        "pontuacao_logica": 0.72,
        "fase_sugerida": "FASE_II",
        "raciocinio": "Cenário com governo salvador e viés de esquerda.",
        "fragile_premises": ["Premissa fascista sobre CBDC"],
        "resilience_score": 0.61,
    }
    cleaned = scrub_payload_narratives(
        payload,
        keys=("raciocinio",),
        list_keys=("fragile_premises",),
        layer="test",
    )
    assert cleaned["pontuacao_logica"] == 0.72
    assert cleaned["resilience_score"] == 0.61
    assert cleaned["fase_sugerida"] == "FASE_II"
    assert "salvador" not in cleaned["raciocinio"].lower()
    assert "esquerda" not in cleaned["raciocinio"].lower()
    assert "fascista" not in cleaned["fragile_premises"][0].lower()
    assert cleaned.get("_neutrality_flags")


def test_scrub_nested_synthesis():
    payload = {
        "fragility_index": 0.55,
        "synthesis": {
            "synthesis": "Cenário brutal e libertador no horizonte.",
            "source": "heuristic",
        },
    }
    cleaned = scrub_payload_narratives(payload, layer="camada_12")
    assert cleaned["fragility_index"] == 0.55
    text = cleaned["synthesis"]["synthesis"].lower()
    assert "brutal" not in text
    assert "libertador" not in text
