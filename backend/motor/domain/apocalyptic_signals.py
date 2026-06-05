from __future__ import annotations

from typing import Any

# Taxonomia de eventos (Camada 4) — eixos de engano / narrativa extraterrestre
NARRATIVE_EVENT_TYPES = frozenset(
    {
        "narrativa_extraterrestre",
        "narrativa_engano_apocaliptico",
        "prodigio_falso",
    }
)

# Palavras-chave para pré-processamento e detecção heurística
UFO_DISCLOSURE_KEYWORDS = frozenset(
    {
        "ufo",
        "uap",
        "ovni",
        "alien",
        "aliens",
        "extraterrestrial",
        "extraterrestre",
        "disclosure",
        "pentagon",
        "non-human",
        "nao-humano",
        "não-humano",
        "flying object",
        "objeto voador",
    }
)

DECEPTION_KEYWORDS = frozenset(
    {
        "engano",
        "deception",
        "false prophet",
        "falso profeta",
        "falso messias",
        "false messiah",
        "prodigio",
        "prodígio",
        "wonder",
        "signs and wonders",
        "sinais enganosos",
        "great deception",
        "grande engano",
        "lying signs",
        "apocalyptic",
        "apocalipse",
        "end times",
        "ultimos dias",
        "últimos dias",
    }
)

# SIGNAL_KEYWORDS — profecias pendentes x eixos hermenêutico + UFO/disclosure
PROPHECY_SIGNAL_KEYWORDS: dict[str, list[str]] = {
    "pend_paz_falsa_oriente": ["paz", "tratado", "oriente", "israel", "jerusalém", "acordo"],
    "pend_marca_compra_venda": ["cbdc", "marca", "biometria", "compra", "venda", "pagamento"],
    "pend_besta_mar": [
        "anticristo",
        "besta",
        "mar",
        "lider",
        "global",
        "onu",
        "governo",
        "autoridade",
        "bloco",
    ],
    "pend_besta_terra": [
        "falso",
        "profeta",
        "coerção",
        "imagem",
        "adorar",
        "prodigio",
        "prodígio",
        "engano",
        "sinal",
        "maravilha",
        "dragão",
        "dragao",
    ],
    "pend_templo_restaurado": ["templo", "santuario", "sacrificio", "jerusalém"],
    "pend_arrebatamento": ["arrebatamento", "trombeta", "encontro", "ar"],
    "pend_dois_testemunhas": ["testemunhas", "profetizar", "jerusalém", "1260"],
    "pend_sinais_cosmicos_finais": ["sol", "lua", "eclipse", "sismo", "terremoto", "céu", "ceu"],
    "pend_cbdc_piloto": ["cbdc", "moeda", "digital", "central", "piloto"],
    "pend_enganos_apocalipse": [
        "engano",
        "deception",
        "falso profeta",
        "falso messias",
        "false prophet",
        "prodigio",
        "prodígio",
        "sinais enganosos",
        "lying signs",
        "great deception",
        "ultimos dias",
        "últimos dias",
        "apocalipse",
        "2ts",
        "ap 13",
    ],
    "pend_narrativa_extraterrestre": [
        "ufo",
        "uap",
        "ovni",
        "alien",
        "aliens",
        "extraterrestrial",
        "extraterrestre",
        "disclosure",
        "pentagon",
        "nao-humano",
        "não-humano",
        "objeto voador",
        "nave",
        "contato",
        "civilizacao",
        "civilização",
    ],
}


def event_matches_narrative_axis(event: dict[str, Any]) -> bool:
    slug = str(event.get("evento", ""))
    if slug in NARRATIVE_EVENT_TYPES:
        return True
    tags = [str(t).lower() for t in event.get("tags", []) or []]
    blob = " ".join(
        [
            slug,
            str(event.get("descricao", "")),
            *tags,
        ]
    ).lower()
    return any(kw in blob for kw in UFO_DISCLOSURE_KEYWORDS | DECEPTION_KEYWORDS)


def compute_apocalyptic_axis_metrics(events: list[dict[str, Any]]) -> dict[str, float]:
    if not events:
        return {
            "narrativa_extraterrestre_ratio": 0.0,
            "engano_apocaliptico_score": 0.0,
            "prodigios_narrativos_score": 0.0,
        }

    n = len(events)
    ufo_hits = 0
    deception_hits = 0
    prodigio_hits = 0

    for event in events:
        slug = str(event.get("evento", ""))
        desc = str(event.get("descricao", "")).lower()
        tags_blob = " ".join(str(t).lower() for t in event.get("tags", []) or [])
        blob = f"{slug} {desc} {tags_blob}"

        if slug == "narrativa_extraterrestre" or any(k in blob for k in UFO_DISCLOSURE_KEYWORDS):
            ufo_hits += 1
        if slug in ("narrativa_engano_apocaliptico", "prodigio_falso") or any(
            k in blob for k in DECEPTION_KEYWORDS
        ):
            deception_hits += 1
        if slug == "prodigio_falso" or "prodigio" in blob or "prodígio" in blob:
            prodigio_hits += 1

    return {
        "narrativa_extraterrestre_ratio": round(ufo_hits / n, 4),
        "engano_apocaliptico_score": round(deception_hits / n, 4),
        "prodigios_narrativos_score": round(prodigio_hits / n, 4),
    }
