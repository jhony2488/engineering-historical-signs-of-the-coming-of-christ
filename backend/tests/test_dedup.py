from motor.pipeline.preprocessing.dedup import content_fingerprint, is_semantic_duplicate


def test_semantic_duplicate_detects_repeat():
    seen: set[str] = set()
    text = "Conflito militar se intensifica na região do oriente médio"
    assert is_semantic_duplicate(text, seen) is False
    assert is_semantic_duplicate(text, seen) is True


def test_content_fingerprint_stable():
    assert content_fingerprint("ABC") == content_fingerprint("ABC")
