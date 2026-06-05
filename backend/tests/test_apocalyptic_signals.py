from motor.domain.apocalyptic_signals import (
    compute_apocalyptic_axis_metrics,
    event_matches_narrative_axis,
)
from motor.pipeline.fulfillment_tracker import _score_match


def test_compute_apocalyptic_axis_detects_ufo_event():
    events = [
        {
            "evento": "narrativa_extraterrestre",
            "descricao": "Congress holds UFO disclosure hearing on non-human craft",
            "grau_tensao": 0.6,
            "impacto_global": 0.55,
            "tags": ["uap", "disclosure"],
        }
    ]
    metrics = compute_apocalyptic_axis_metrics(events)
    assert metrics["narrativa_extraterrestre_ratio"] == 1.0
    assert metrics["engano_apocaliptico_score"] >= 0.0


def test_event_matches_narrative_axis_by_keywords():
    event = {
        "evento": "sinal_geopolitico",
        "descricao": "Pentagon releases UAP report amid alien speculation",
        "tags": [],
    }
    assert event_matches_narrative_axis(event) is True


def test_score_match_links_ufo_corpus_to_extraterrestrial_prophecy():
    score = _score_match(
        "pend_narrativa_extraterrestre",
        "Narrativa extraterrestre/UAP como pressão escatológica",
        (
            "Narrativa extraterrestre UAP ovni UFO disclosure Pentágono "
            "audiência não-humano alienígena civilização"
        ),
    )
    assert score >= 0.45


def test_score_match_links_deception_corpus_to_apocalypse_prophecy():
    score = _score_match(
        "pend_enganos_apocalipse",
        "Enganos e sinais enganosos nos últimos dias",
        (
            "Falso profeta anuncia engano apocalíptico com sinais enganosos "
            "e prodígios nos últimos dias"
        ),
    )
    assert score >= 0.45
