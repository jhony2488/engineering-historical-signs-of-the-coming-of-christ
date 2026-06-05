from __future__ import annotations

import hashlib
import re


def normalize_for_dedup(text: str) -> str:
    text = re.sub(r"\s+", " ", text.strip().lower())
    return text[:2000]


def content_fingerprint(text: str) -> str:
    return hashlib.sha256(normalize_for_dedup(text).encode()).hexdigest()


def is_semantic_duplicate(text: str, seen_hashes: set[str], threshold_prefix: int = 16) -> bool:
    """Dedup por hash completo + prefixo (aproximação leve sem embeddings)."""
    fp = content_fingerprint(text)
    if fp in seen_hashes:
        return True
    prefix = fp[:threshold_prefix]
    for h in seen_hashes:
        if h[:threshold_prefix] == prefix:
            return True
    seen_hashes.add(fp)
    return False
