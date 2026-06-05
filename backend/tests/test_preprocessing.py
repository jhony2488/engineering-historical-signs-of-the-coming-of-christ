"""Testes do pré-processador (Camada 2)."""

from motor.pipeline.preprocessing.processor import Preprocessor


def test_clean_text_strips_html():
    p = Preprocessor()
    raw = "<p>Guerra no <b>Oriente Médio</b> com tensão.</p>"
    assert p.clean_text(raw) == "Guerra no Oriente Médio com tensão."


def test_clean_text_collapses_whitespace():
    p = Preprocessor()
    assert p.clean_text("  múltiplos   espaços  ") == "múltiplos espaços"


def test_chunk_splits_long_text():
    p = Preprocessor()
    text = "a" * 2000
    chunks = p.chunk(text)
    assert len(chunks) >= 2
    assert all(len(c) <= p.CHUNK_SIZE for c in chunks)


def test_chunk_short_text_single():
    p = Preprocessor()
    text = "texto curto"
    assert p.chunk(text) == [text]


def test_infer_topics_oriente_medio():
    p = Preprocessor()
    topics = p.infer_topics("Conflict escalates in Israel and Gaza region")
    assert "oriente_medio" in topics


def test_infer_topics_fallback_geral():
    p = Preprocessor()
    topics = p.infer_topics("notícia genérica sem keywords")
    assert topics == ["geral"]


def test_process_document_returns_chunks():
    p = Preprocessor()
    chunks = p.process_document("doc-1", "Guerra no oriente medio com cbdc digital")
    assert len(chunks) >= 1
    assert chunks[0].documento_id == "doc-1"
    assert chunks[0].indice == 0
    assert "oriente_medio" in chunks[0].topicos or "tecnologia" in chunks[0].topicos
