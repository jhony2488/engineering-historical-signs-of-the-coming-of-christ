from __future__ import annotations

import re

_nlp = None


def _load_spacy():
    global _nlp
    if _nlp is not None:
        return _nlp if _nlp is not False else None
    try:
        import spacy

        try:
            _nlp = spacy.load("pt_core_news_sm")
        except OSError:
            _nlp = spacy.blank("pt")
    except ImportError:
        _nlp = False
    return _nlp if _nlp is not False else None


def extract_entities(text: str) -> list[str]:
    nlp = _load_spacy()
    if not nlp:
        return []
    doc = nlp(text[:5000])
    return list({ent.text for ent in doc.ents if len(ent.text) > 2})[:20]


def enrich_topics(text: str, base_topics: list[str]) -> list[str]:
    topics = list(base_topics)
    entities = extract_entities(text)
    for ent in entities:
        slug = re.sub(r"[^a-z0-9]+", "_", ent.lower()).strip("_")
        if slug and slug not in topics:
            topics.append(slug)
    return topics[:12]
