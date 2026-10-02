from __future__ import annotations

from pathlib import Path

PROMPTS_DIR = Path(__file__).resolve().parent / "v1"
DEBIASING_MARKER = "{{debiasing}}"
PROMPT_VERSION = "v1.2-debias"

_SYSTEM_DEBIAS = {
    "pt": (
        "Protocolo anti-viés obrigatório: descreva mecanismos observáveis, não intenções nem ideologias; "
        "proibido rotular esquerda/direita/bom/mau; sem adjetivos emocionais; "
        "simetria analítica entre países/regimes; fatos verificáveis apenas; analogia estrutural ≠ profecia datada."
    ),
    "en": (
        "Mandatory anti-bias protocol: describe observable mechanisms, not intentions or ideologies; "
        "no left/right/good/bad labeling; no emotional adjectives; "
        "analytical symmetry across countries/regimes; verifiable facts only; structural analogy ≠ dated prophecy."
    ),
}

_PROMPT_DIRS = {"pt": "v1", "en": "v2_en"}
_PROMPT_VERSIONS = {"pt": "v1.2-debias", "en": "v2.0-en"}

SYSTEM_DEBIAS_MESSAGE = _SYSTEM_DEBIAS["pt"]


def prompts_lang() -> str:
    """pt (v1, default) | en (v2_en) — controlado por PROMPTS_LANG."""
    from motor.config import get_settings

    return get_settings().prompts_lang


def _prompts_dir() -> Path:
    return Path(__file__).resolve().parent / _PROMPT_DIRS.get(prompts_lang(), "v1")


def get_prompt_version() -> str:
    return _PROMPT_VERSIONS.get(prompts_lang(), PROMPT_VERSION)


def _system_debias_message() -> str:
    return _SYSTEM_DEBIAS.get(prompts_lang(), _SYSTEM_DEBIAS["pt"])


def load_raw_prompt(name: str) -> str:
    return (_prompts_dir() / name).read_text(encoding="utf-8")


def load_debiasing() -> str:
    path = _prompts_dir() / "debiasing_shared.txt"
    if path.exists():
        return path.read_text(encoding="utf-8").strip()
    return ""


def compose_prompt(name: str) -> str:
    """Carrega template e injeta o protocolo anti-viés compartilhado."""
    template = load_raw_prompt(name)
    debiasing = load_debiasing()
    if DEBIASING_MARKER in template:
        return template.replace(DEBIASING_MARKER, debiasing)
    if debiasing:
        return f"{debiasing}\n\n{template}"
    return template


def with_system_debias(layer_instructions: str) -> str:
    """Prefixa instruções de camada com a system message anti-viés unificada."""
    base = layer_instructions.strip()
    return f"{_system_debias_message()} {base}".strip()
