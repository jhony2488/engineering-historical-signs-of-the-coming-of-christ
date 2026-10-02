from __future__ import annotations

from pathlib import Path

PROMPTS_DIR = Path(__file__).resolve().parents[1] / "prompts" / "v1"
DEBIASING = (PROMPTS_DIR / "debiasing_shared.txt").read_text(encoding="utf-8") if (
    PROMPTS_DIR / "debiasing_shared.txt"
).exists() else ""


def load_prompt(name: str, **replacements: str) -> str:
    text = (PROMPTS_DIR / name).read_text(encoding="utf-8")
    text = text.replace("{{debiasing}}", DEBIASING)
    for key, value in replacements.items():
        text = text.replace("{{" + key + "}}", value)
    return text
