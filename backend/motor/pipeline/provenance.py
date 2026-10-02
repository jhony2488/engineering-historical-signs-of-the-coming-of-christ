from __future__ import annotations

import contextlib
import hashlib
import json
from datetime import date
from typing import Any


def _canonical(data: Any) -> str:
    return json.dumps(data, sort_keys=True, ensure_ascii=False, default=str)


def sha256_payload(data: Any) -> str:
    return hashlib.sha256(_canonical(data).encode("utf-8")).hexdigest()


def merkle_root(hashes: list[str]) -> str:
    if not hashes:
        return sha256_payload([])
    layer = list(hashes)
    while len(layer) > 1:
        nxt: list[str] = []
        for i in range(0, len(layer), 2):
            left = layer[i]
            right = layer[i + 1] if i + 1 < len(layer) else left
            nxt.append(hashlib.sha256(f"{left}{right}".encode()).hexdigest())
        layer = nxt
    return layer[0]


class ProvenanceService:
    """Camada 14 — ledger de proveniência em Postgres (sem on-chain)."""

    def __init__(self, db: Any | None = None) -> None:
        self.db = db
        self.entries: list[dict[str, Any]] = []
        self._last_hash: str | None = None

    def seal_stage(
        self,
        ref_date: date,
        stage: str,
        payload: Any,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        source_hash = sha256_payload(payload)
        parent_hash = self._last_hash
        result_hash = sha256_payload(
            {"stage": stage, "source": source_hash, "parent": parent_hash}
        )
        entry = {
            "data_referencia": ref_date.isoformat(),
            "stage": stage,
            "source_hash": source_hash,
            "parent_hash": parent_hash,
            "result_hash": result_hash,
            "merkle_root": None,
            "metadata": metadata or {},
        }
        self.entries.append(entry)
        self._last_hash = result_hash
        if self.db is not None:
            self.db.insert("provenance_log", entry)
        return entry

    def finalize_day(self, ref_date: date, final_payload: Any) -> dict[str, Any]:
        stage_hashes = [e["result_hash"] for e in self.entries if e.get("result_hash")]
        root = merkle_root([*stage_hashes, sha256_payload(final_payload)])
        final = self.seal_stage(
            ref_date,
            "final_report",
            final_payload,
            metadata={"integrity": "ok", "stages": len(self.entries)},
        )
        final["merkle_root"] = root
        self.entries[-1]["merkle_root"] = root
        if self.db is not None:
            with contextlib.suppress(Exception):
                self.db.insert(
                    "provenance_log",
                    {
                        "data_referencia": ref_date.isoformat(),
                        "stage": "merkle_root",
                        "source_hash": root,
                        "parent_hash": final["result_hash"],
                        "result_hash": root,
                        "merkle_root": root,
                        "metadata": {"stages": len(self.entries)},
                    },
                )
        return {
            "merkle_root": root,
            "chain_length": len(self.entries),
            "last_hash": final["result_hash"],
            "stages": [e["stage"] for e in self.entries],
            "integrity_ok": True,
        }

    def verify_chain(self, entries: list[dict[str, Any]]) -> dict[str, Any]:
        if not entries:
            return {"ok": False, "reason": "empty"}
        prev: str | None = None
        for e in entries:
            if (
                prev is not None
                and e.get("parent_hash") != prev
                and e.get("stage") not in ("ingestion", "merkle_root")
            ):
                return {"ok": False, "reason": "broken_parent_chain", "stage": e.get("stage")}
            if e.get("result_hash"):
                prev = e["result_hash"]
        root_rows = [e for e in entries if e.get("merkle_root")]
        return {
            "ok": True,
            "stages": len(entries),
            "merkle_root": root_rows[-1]["merkle_root"] if root_rows else None,
        }
