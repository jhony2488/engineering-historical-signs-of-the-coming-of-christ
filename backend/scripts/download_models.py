"""Baixa os candidatos GGUF do tier SLM local para `backend/models_cache/`.

Uso (a partir de `backend/`):

    python scripts/download_models.py             # só o 1º candidato de cada alias
    python scripts/download_models.py --all       # cascata inteira (7B→3B→1.5B)
    python scripts/download_models.py --list      # lista candidatos sem baixar

Requer `huggingface_hub` (instalado via extras `[ml]`).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from motor.adapters.local_llm import iter_candidates
from motor.config import get_settings


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--all", action="store_true", help="baixa a cascata inteira")
    parser.add_argument("--list", action="store_true", help="lista sem baixar")
    args = parser.parse_args()

    models_dir = Path(get_settings().local_models_dir)
    models_dir.mkdir(parents=True, exist_ok=True)

    seen: set[str] = set()
    candidates = [
        c for c in iter_candidates() if c["file"] not in seen and not seen.add(c["file"])
    ]
    if not args.all:
        by_alias: dict[str, list[dict]] = {}
        from motor.adapters.local_llm import LOCAL_MODEL_MAP

        by_alias = LOCAL_MODEL_MAP
        candidates = [c[0] for c in by_alias.values() if c]

    if args.list:
        for c in candidates:
            mark = "ok" if (models_dir / c["file"]).exists() else "--"
            print(f"[{mark}] {c['file']}  ({c['hf_repo']})")
        return 0

    try:
        from huggingface_hub import hf_hub_download
    except ImportError:
        print("huggingface_hub indisponível — pip install -e '.[ml]'")
        return 1

    for c in candidates:
        target = models_dir / c["file"]
        if target.exists():
            print(f"[skip] {c['file']} já existe")
            continue
        print(f"[down] {c['file']} ← {c['hf_repo']}")
        hf_hub_download(
            repo_id=c["hf_repo"], filename=c["file"], local_dir=str(models_dir)
        )
        print(f"[done] {c['file']}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
