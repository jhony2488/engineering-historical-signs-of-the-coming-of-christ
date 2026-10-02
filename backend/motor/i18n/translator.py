from __future__ import annotations

import re
from typing import Any

import structlog

from motor.config import get_settings

logger = structlog.get_logger()

# Correções pós-tradução para termos de domínio que o NLLB tende a perder.
GLOSSARY: dict[str, str] = {
    r"\bbeast of the sea\b": "Besta do Mar",
    r"\bbeast of the earth\b": "Besta da Terra",
    r"\bmark of the beast\b": "Marca da Besta",
    r"\bparousia\b": "Parusia",
    r"\bgreat tribulation\b": "Grande Tribulação",
    r"\bgreat apostasy\b": "Grande Apostasia",
    r"\bbeginning of sorrows\b": "Início das Dores",
    r"\bfalse prophet\b": "Falso Profeta",
    r"\bday(s)? of the lord\b": "Dia do Senhor",
}

# Abreviações de livros bíblicos EN → PT (padrão das referências persistidas).
BIBLICAL_REF_MAP: dict[str, str] = {
    "Matt": "Mt",
    "Mark": "Mc",
    "Luke": "Lc",
    "John": "Jo",
    "Acts": "At",
    "Rom": "Rm",
    "1 Cor": "1Co",
    "2 Cor": "2Co",
    "Gal": "Gl",
    "Eph": "Ef",
    "Phil": "Fp",
    "Col": "Cl",
    "1 Thess": "1Ts",
    "2 Thess": "2Ts",
    "1 Tim": "1Tm",
    "2 Tim": "2Tm",
    "Titus": "Tt",
    "Phlm": "Fm",
    "Heb": "Hb",
    "Jas": "Tg",
    "1 Pet": "1Pe",
    "2 Pet": "2Pe",
    "1 John": "1Jo",
    "2 John": "2Jo",
    "3 John": "3Jo",
    "Jude": "Jd",
    "Rev": "Ap",
    "Gen": "Gn",
    "Exod": "Ex",
    "Lev": "Lv",
    "Num": "Nm",
    "Deut": "Dt",
    "Josh": "Js",
    "Judg": "Jz",
    "Ruth": "Rt",
    "1 Sam": "1Sm",
    "2 Sam": "2Sm",
    "1 Kgs": "1Rs",
    "2 Kgs": "2Rs",
    "1 Chr": "1Cr",
    "2 Chr": "2Cr",
    "Ezra": "Ed",
    "Neh": "Ne",
    "Esth": "Et",
    "Job": "Jó",
    "Ps": "Sl",
    "Prov": "Pv",
    "Eccl": "Ec",
    "Song": "Ct",
    "Isa": "Is",
    "Jer": "Jr",
    "Lam": "Lm",
    "Ezek": "Ez",
    "Dan": "Dn",
    "Hos": "Os",
    "Joel": "Jl",
    "Amos": "Am",
    "Obad": "Ob",
    "Jonah": "Jn",
    "Mic": "Mq",
    "Nah": "Na",
    "Hab": "Hc",
    "Zeph": "Sf",
    "Hag": "Ag",
    "Zech": "Zc",
    "Mal": "Ml",
}

# Ordenado por comprimento desc para evitar colisões ("1 Thess" antes de "Thess").
_REF_PATTERN = re.compile(
    r"\b(" + "|".join(sorted(BIBLICAL_REF_MAP, key=len, reverse=True)) + r")\b"
)


class TranslationService:
    """EN→PT via NLLB-200-distilled-600M (lazy, CPU-only).

    Indisponível (sem transformers/modelo) → passthrough EN com warn —
    o pipeline nunca quebra por causa da tradução.
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self._pipe: Any | None = None

    def _get_pipeline(self):
        if self._pipe is None:
            try:
                from transformers import pipeline

                self._pipe = pipeline(
                    "translation",
                    model=self.settings.translator_model,
                    src_lang="eng_Latn",
                    tgt_lang="por_Latn",
                )
            except Exception as exc:
                logger.warning("translator_unavailable", error=str(exc))
                self._pipe = False
        return self._pipe if self._pipe is not False else None

    @property
    def is_available(self) -> bool:
        return self._get_pipeline() is not None

    def translate_text(self, text: str) -> str:
        if not text:
            return text
        pipe = self._get_pipeline()
        if pipe is None:
            return text
        try:
            out = pipe(text[:2000])
            translated = out[0].get("translation_text", text)
        except Exception as exc:
            logger.warning("translate_failed", error=str(exc))
            return text
        return self._apply_glossary(translated)

    def _apply_glossary(self, text: str) -> str:
        for pattern, term in GLOSSARY.items():
            text = re.sub(pattern, term, text, flags=re.IGNORECASE)
        return text

    def map_biblical_refs(self, text: str) -> str:
        """Abreviações EN→PT em referências ('Matt 24:6-7' → 'Mt 24:6-7')."""
        if not text:
            return text
        return _REF_PATTERN.sub(lambda m: BIBLICAL_REF_MAP[m.group(0)], text)

    def _walk(self, obj: Any, path: str, fn) -> None:
        """Aplica fn(str)->str em todos os valores alcançados por `path`.

        'campo' | 'campo[]' | 'campo[].sub' | 'a.b' — tolera chaves ausentes.
        """
        head, _, rest = path.partition(".")
        is_list = head.endswith("[]")
        key = head[:-2] if is_list else head
        if not isinstance(obj, dict) or key not in obj:
            return
        value = obj[key]
        if is_list:
            if not isinstance(value, list):
                return
            if not rest:
                obj[key] = [fn(i) if isinstance(i, str) else i for i in value]
            else:
                for item in value:
                    self._walk(item, rest, fn)
            return
        if rest:
            self._walk(value, rest, fn)
        elif isinstance(value, str):
            obj[key] = fn(value)

    def translate_fields(self, obj: dict[str, Any], spec: list[str]) -> dict[str, Any]:
        for path in spec:
            self._walk(obj, path, self.translate_text)
        return obj

    def map_ref_fields(self, obj: dict[str, Any], spec: list[str]) -> dict[str, Any]:
        for path in spec:
            self._walk(obj, path, self.map_biblical_refs)
        return obj
