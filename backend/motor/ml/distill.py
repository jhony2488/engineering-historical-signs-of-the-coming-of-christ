from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np
import structlog

from motor.config import CONFIG_DIR, get_settings
from motor.schemas.validator import get_validator

logger = structlog.get_logger()

DEFAULT_MODEL_DIR = CONFIG_DIR / "event_classifier"
_CLASSIFICATION_FIELDS = ("evento", "regiao", "energia", "dimensao")
_REGRESSION_FIELDS = ("grau_tensao", "impacto_global")


class ExtractionDatasetExporter:
    """Exporta pares (texto do trecho, extração validada do LLM) de
    `eventos_estruturados` x `trechos_processados` para destilação."""

    def __init__(self, db: Any) -> None:
        self.db = db
        self.settings = get_settings()

    def export(self, out_path: Path, min_rows: int | None = None) -> dict[str, Any]:
        min_rows = min_rows or self.settings.distill_min_rows
        trechos = {
            str(r.get("id")): str(r.get("texto", ""))
            for r in self.db.select("trechos_processados", limit=100_000)
        }
        rows = self.db.select("eventos_estruturados", limit=50_000)

        examples: list[dict[str, Any]] = []
        for row in rows:
            dados = row.get("dados") or {}
            texto = trechos.get(str(row.get("trecho_id", "")), "")
            if not texto or not dados.get("evento"):
                continue
            examples.append(
                {
                    "texto": texto,
                    "evento": dados.get("evento"),
                    "regiao": dados.get("regiao", "outro"),
                    "energia": dados.get("energia", "contracao"),
                    "dimensao": dados.get("dimensao", "macro"),
                    "grau_tensao": float(dados.get("grau_tensao", 0.5)),
                    "impacto_global": float(dados.get("impacto_global", 0.5)),
                }
            )

        if len(examples) < min_rows:
            return {
                "ok": False,
                "n_rows": len(examples),
                "min_rows": min_rows,
                "message": "Dados insuficientes para destilação — acumule mais runs ou reduza --min-rows",
            }

        out_path.parent.mkdir(parents=True, exist_ok=True)
        with out_path.open("w", encoding="utf-8") as f:
            for ex in examples:
                f.write(json.dumps(ex, ensure_ascii=False) + "\n")

        logger.info("extraction_dataset_exported", n=len(examples), path=str(out_path))
        return {"ok": True, "n_rows": len(examples), "path": str(out_path)}


def train_event_classifier(dataset_path: Path, out_dir: Path) -> dict[str, Any]:
    """Treina classificadores lineares sobre embeddings BGE-M3.

    Requer extras [ml] + scikit-learn. Artefatos: <out_dir>/{campo}.joblib
    + meta.json com métricas holdout.
    """
    try:
        import joblib
        from sklearn.linear_model import LogisticRegression, Ridge
        from sklearn.metrics import accuracy_score, mean_absolute_error
        from sklearn.model_selection import train_test_split
    except ImportError as exc:
        return {"ok": False, "message": f"scikit-learn indisponível: {exc}"}

    from motor.pipeline.embeddings.service import EmbeddingService

    settings = get_settings()
    examples = [
        json.loads(line)
        for line in dataset_path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    if len(examples) < settings.distill_min_rows:
        return {
            "ok": False,
            "message": f"dataset com {len(examples)} < {settings.distill_min_rows} linhas",
        }

    embeddings = EmbeddingService()
    if not embeddings.is_available:
        return {"ok": False, "message": "modelo de embedding indisponível"}

    texts = [e["texto"][:2000] for e in examples]
    x = np.array(embeddings.embed_texts(texts), dtype=float)

    out_dir.mkdir(parents=True, exist_ok=True)
    metrics: dict[str, Any] = {}
    labels_meta: dict[str, list[str]] = {}

    for field in _CLASSIFICATION_FIELDS:
        y = np.array([str(e[field]) for e in examples])
        classes = sorted(set(y))
        labels_meta[field] = classes
        if len(classes) < 2:
            metrics[field] = {"skipped": True, "reason": "classe única"}
            continue
        stratify = y if min(np.unique(y, return_counts=True)[1]) >= 2 else None
        x_tr, x_te, y_tr, y_te = train_test_split(
            x, y, test_size=0.2, random_state=42, stratify=stratify
        )
        clf = LogisticRegression(max_iter=1000)
        clf.fit(x_tr, y_tr)
        metrics[field] = {"accuracy": round(float(accuracy_score(y_te, clf.predict(x_te))), 4)}
        joblib.dump(clf, out_dir / f"{field}.joblib")

    for field in _REGRESSION_FIELDS:
        y = np.array([float(e[field]) for e in examples])
        x_tr, x_te, y_tr, y_te = train_test_split(x, y, test_size=0.2, random_state=42)
        reg = Ridge()
        reg.fit(x_tr, y_tr)
        metrics[field] = {
            "mae": round(float(mean_absolute_error(y_te, reg.predict(x_te))), 4)
        }
        joblib.dump(reg, out_dir / f"{field}.joblib")

    meta = {
        "created_at": datetime.now(UTC).isoformat(),
        "n_rows": len(examples),
        "base_model": settings.bge_model_name,
        "labels": labels_meta,
        "metrics": metrics,
    }
    (out_dir / "meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    logger.info("event_classifier_trained", metrics=metrics)
    return {"ok": True, "metrics": metrics, "model_dir": str(out_dir)}


class LocalEventExtractor:
    """Camada 4 sem LLM: embeddings BGE + cabeças sklearn destiladas.

    Ativo quando extraction_mode=classifier_first. Saída validada por
    `evento_estruturado.schema.json`; `descricao` é extrativa (início do
    trecho) — campos narrativos continuam responsabilidade de LLM.
    """

    def __init__(
        self, embeddings: Any | None = None, model_dir: Path | None = None
    ) -> None:
        from motor.pipeline.embeddings.service import EmbeddingService

        self.embeddings = embeddings or EmbeddingService()
        self.model_dir = model_dir or DEFAULT_MODEL_DIR
        self._models: dict[str, Any] | None = None
        self._meta: dict[str, Any] | None = None

    def _load(self) -> bool:
        if self._models is not None:
            return True
        meta_path = self.model_dir / "meta.json"
        if not meta_path.exists():
            return False
        try:
            import joblib

            self._meta = json.loads(meta_path.read_text(encoding="utf-8"))
            self._models = {
                field: joblib.load(self.model_dir / f"{field}.joblib")
                for field in (*_CLASSIFICATION_FIELDS, *_REGRESSION_FIELDS)
                if (self.model_dir / f"{field}.joblib").exists()
            }
            return bool(self._models)
        except Exception as exc:
            logger.warning("local_extractor_load_failed", error=str(exc))
            self._models = {}
            return False

    @property
    def available(self) -> bool:
        return self.embeddings.is_available and self._load()

    def extract(self, text: str) -> dict[str, Any] | None:
        if not self.available:
            return None
        try:
            x = np.array(self.embeddings.embed_texts([text[:2000]]), dtype=float)
            out: dict[str, Any] = {}
            confs: list[float] = []
            for field in _CLASSIFICATION_FIELDS:
                clf = self._models.get(field) if self._models else None
                if clf is None:
                    return None
                proba = clf.predict_proba(x)[0]
                idx = int(np.argmax(proba))
                out[field] = str(clf.classes_[idx])
                confs.append(float(proba[idx]))
            for field in _REGRESSION_FIELDS:
                reg = self._models.get(field) if self._models else None
                out[field] = round(
                    min(1.0, max(0.0, float(reg.predict(x)[0]))) if reg else 0.5, 4
                )
            out["descricao"] = text.strip()[:200]
            out["confianca_extracao"] = round(min(confs), 4)
            out["tags"] = []
            get_validator().validate("evento_estruturado", out)
            return out
        except Exception as exc:
            logger.warning("local_extractor_failed", error=str(exc))
            return None
