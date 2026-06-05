from motor.ml.spiritual_tone_classifier import classify_spiritual_tone, keyword_scores


def test_keyword_scores_expansao():
    exp, con = keyword_scores("despertamento espiritual e esperanca no evangelho")
    assert exp > con


def test_keyword_scores_contracao():
    exp, con = keyword_scores("perseguicao totalitaria e vigilancia cbdc")
    assert con > exp


def test_classify_spiritual_tone_structure():
    out = classify_spiritual_tone("conflito e apostasia global")
    assert "expansao_score" in out
    assert "contracao_score" in out
    assert out["energia"] in ("expansao", "contracao")
    assert 0 <= out["expansao_score"] <= 1
