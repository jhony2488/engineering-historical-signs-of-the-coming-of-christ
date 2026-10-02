from __future__ import annotations

import re
from typing import Any

import structlog

logger = structlog.get_logger()

# Termo enviesado → substituto neutro (mecanismo / vazio)
_BIASED_TERMS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\btirânic[oa]s?\b", re.I), "centralizador"),
    (re.compile(r"\blibertador(?:es|as)?\b", re.I), "ator institucional"),
    (re.compile(r"\bopress(?:or(?:es)?|ora(?:s)?|ão)\b", re.I), "coerção institucional"),
    (re.compile(r"\bsalvador(?:es|as)?\b", re.I), "líder"),
    (re.compile(r"\bbrutal(?:mente)?\b", re.I), "intenso"),
    (re.compile(r"\bherói?c[oa]s?\b", re.I), ""),
    (re.compile(r"\bfascista(?:s)?\b", re.I), "regime de alta coerção"),
    (re.compile(r"\bcomunista(?:s)?\b", re.I), "regime de alta centralização"),
    (re.compile(r"\bapocal[ií]ptic[oa]s?\b", re.I), "de alta severidade"),
    (re.compile(r"\bde\s+direita\b", re.I), "de um bloco político"),
    (re.compile(r"\bde\s+esquerda\b", re.I), "de um bloco político"),
    (re.compile(r"\bliberal(?:is)?(?:ismo)?\b", re.I), "orientação política"),
    (re.compile(r"\bconservador(?:a|es|as)?\b", re.I), "orientação política"),
    (re.compile(r"\bprogressista(?:s)?\b", re.I), "orientação política"),
    (re.compile(r"\breacionári[oa]s?\b", re.I), "orientação política"),
    (re.compile(r"\bbom(?:s|a|as)?\b(?=\s+(?:líder|governo|regime))", re.I), ""),
    (re.compile(r"\bmau(?:s|s)?\b(?=\s+(?:líder|governo|regime))", re.I), ""),
    (re.compile(r"\bmal(?:vado|igna)?\b", re.I), ""),
]


def scrub_narrative(text: str) -> dict[str, Any]:
    """Sanitiza texto narrativo; não altera números isolados."""
    if not text or not isinstance(text, str):
        return {"text": text if isinstance(text, str) else "", "flags": []}

    flags: list[str] = []
    out = text
    for pattern, replacement in _BIASED_TERMS:
        if pattern.search(out):
            flags.append(pattern.pattern)
            out = pattern.sub(replacement, out)

    out = re.sub(r"\s{2,}", " ", out).strip()
    out = re.sub(r"\s+([,.;:])", r"\1", out)
    return {"text": out, "flags": flags}


def scrub_payload_narratives(
    payload: dict[str, Any],
    *,
    keys: tuple[str, ...] = (),
    list_keys: tuple[str, ...] = (),
    layer: str = "unknown",
) -> dict[str, Any]:
    """Aplica scrub em campos string e listas de strings; preserva scores/números."""
    if not isinstance(payload, dict):
        return payload

    result = dict(payload)
    all_flags: list[str] = []

    for key in keys:
        if key in list_keys:
            continue
        val = result.get(key)
        if isinstance(val, str):
            scrubbed = scrub_narrative(val)
            result[key] = scrubbed["text"]
            all_flags.extend(scrubbed["flags"])

    for key in list_keys:
        val = result.get(key)
        if isinstance(val, list):
            new_list: list[Any] = []
            for item in val:
                if isinstance(item, str):
                    scrubbed = scrub_narrative(item)
                    new_list.append(scrubbed["text"])
                    all_flags.extend(scrubbed["flags"])
                else:
                    new_list.append(item)
            result[key] = new_list

    # Nested synthesis dict (ABM)
    syn = result.get("synthesis")
    if isinstance(syn, dict) and isinstance(syn.get("synthesis"), str):
        scrubbed = scrub_narrative(syn["synthesis"])
        result["synthesis"] = {**syn, "synthesis": scrubbed["text"]}
        all_flags.extend(scrubbed["flags"])
    elif isinstance(syn, str):
        scrubbed = scrub_narrative(syn)
        result["synthesis"] = scrubbed["text"]
        all_flags.extend(scrubbed["flags"])

    if all_flags:
        unique = sorted(set(all_flags))
        logger.info(
            "neutrality_scrub_applied",
            layer=layer,
            flags_count=len(unique),
            flags=unique[:12],
        )
        result["_neutrality_flags"] = unique

    return result
