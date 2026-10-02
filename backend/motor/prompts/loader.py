from __future__ import annotations

from pathlib import Path

PROMPTS_DIR = Path(__file__).resolve().parent / "v1"
DEBIASING_MARKER = "{{debiasing}}"
PROMPT_VERSION = "v1.2-debias"

SYSTEM_DEBIAS_MESSAGE = (
    "Protocolo anti-viés obrigatório: descreva mecanismos observáveis, não intenções nem ideologias; "
    "proibido rotular esquerda/direita/bom/mau; sem adjetivos emocionais; "
    "simetria analítica entre países/regimes; fatos verificáveis apenas; analogia estrutural ≠ profecia datada."
)


def load_raw_prompt(name: str) -> str:
    return (PROMPTS_DIR / name).read_text(encoding="utf-8")


def load_debiasing() -> str:
    path = PROMPTS_DIR / "debiasing_shared.txt"
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
    return f"{SYSTEM_DEBIAS_MESSAGE} {base}".strip()
