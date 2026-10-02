"""Shared fixtures for eschatological engine tests."""

from __future__ import annotations

import json
from datetime import date, timedelta
from pathlib import Path

import pytest

CANDIDATOS_PATH = Path(__file__).resolve().parents[1] / "config" / "candidatos_seed.json"

SAMPLE_EVENTS = [
    {
        "evento": "conflito_militar",
        "regiao": "oriente_medio",
        "grau_tensao": 0.84,
        "impacto_global": 0.72,
        "energia": "contracao",
        "dimensao": "macro",
        "descricao": "Tensões na região profética.",
    },
    {
        "evento": "despertamento_local",
        "regiao": "comunidades",
        "grau_tensao": 0.2,
        "impacto_global": 0.35,
        "energia": "expansao",
        "dimensao": "micro",
        "descricao": "Vigilância em comunidades locais.",
    },
]

SAMPLE_REASONING = {
    "pontuacao_logica": 0.68,
    "fase_sugerida": "FASE_II",
}


@pytest.fixture
def candidatos_seed() -> list[dict]:
    return json.loads(CANDIDATOS_PATH.read_text(encoding="utf-8"))


@pytest.fixture
def llm_dry_run(monkeypatch: pytest.MonkeyPatch):
    """Enables LLM_DRY_RUN and clears settings cache."""
    monkeypatch.setenv("LLM_DRY_RUN", "true")
    from motor.config import get_settings

    get_settings.cache_clear()
    yield
    monkeypatch.delenv("LLM_DRY_RUN", raising=False)
    get_settings.cache_clear()


@pytest.fixture
def ref_date() -> date:
    return date(2026, 6, 4)


@pytest.fixture
def historico_mock_rows() -> list[dict]:
    rows = []
    for i in range(7):
        d = date.today() - timedelta(days=6 - i)
        rows.append(
            {
                "data_referencia": d.isoformat(),
                "fase_atual": "FASE_I" if i < 2 else "FASE_II",
                "indice_global": 0.40 + i * 0.03,
                "probabilidade_fase": 0.38 + i * 0.04,
            }
        )
    return rows


class FakeSupabase:
    """Minimal SupabaseClient stub for unit tests."""

    def __init__(
        self,
        historico: list[dict] | None = None,
        rankings: dict[tuple[str, date], list[dict]] | None = None,
        latest_resultado: dict | None = None,
        snapshots: dict[str, dict] | None = None,
        tables: dict[str, list[dict]] | None = None,
    ) -> None:
        self.historico = historico or []
        self.rankings = rankings or {}
        self.latest_resultado = latest_resultado
        self.snapshots = snapshots or {}
        self.tables = tables or {}
        self.inserts: list[tuple[str, dict]] = []
        self.audits: list[dict] = []

    def select(
        self,
        table: str,
        columns: str = "*",
        filters: dict | None = None,
        order: str | None = None,
        limit: int | None = None,
    ) -> list[dict]:
        rows = list(self.tables.get(table, []))
        for key, value in (filters or {}).items():
            rows = [r for r in rows if r.get(key) == value]
        if order:
            desc = order.startswith("-")
            col = order.lstrip("-")
            rows.sort(key=lambda r: r.get(col) or "", reverse=desc)
        if limit:
            rows = rows[:limit]
        return rows

    def upsert(self, table: str, data: dict, on_conflict: str = "id") -> dict:
        self.tables.setdefault(table, []).append(dict(data))
        return data

    def update(self, table: str, filters: dict, data: dict) -> list[dict]:
        rows = self.tables.get(table, [])
        matched = [row for row in rows if all(row.get(k) == v for k, v in filters.items())]
        for row in matched:
            row.update(data)
        return matched

    def insert_proposta_ajuste(
        self,
        tipo: str,
        alvo: str,
        valor_proposto,
        valor_atual=None,
        justificativa=None,
        modelo=None,
        origem: str = "manual",
    ) -> dict:
        return self.insert(
            "propostas_ajuste",
            {
                "tipo": tipo,
                "alvo": alvo,
                "valor_atual": valor_atual,
                "valor_proposto": valor_proposto,
                "justificativa": justificativa,
                "modelo": modelo,
                "origem": origem,
                "status": "pendente",
            },
        )

    def list_propostas_ajuste(self, status=None, limit: int = 50) -> list[dict]:
        filters = {"status": status} if status else None
        return self.select("propostas_ajuste", filters=filters, order="-created_at", limit=limit)

    def set_proposta_status(self, proposta_id, status, revisado_por=None, motivo=None):
        data = {"status": status, "revisado_em": "now"}
        if revisado_por:
            data["revisado_por"] = revisado_por
        if motivo:
            data["revisao_motivo"] = motivo
        if status == "aplicada":
            data["aplicado_em"] = "now"
        return self.update("propostas_ajuste", {"id": proposta_id}, data)

    def log_audit(
        self,
        camada: str,
        modelo: str,
        prompt_version: str,
        input_hash: str,
        decisao: str,
        detalhes: dict | None = None,
    ) -> None:
        self.audits.append(
            {
                "camada": camada,
                "modelo": modelo,
                "prompt_version": prompt_version,
                "input_hash": input_hash,
                "decisao": decisao,
                "detalhes": detalhes or {},
            }
        )

    def get_historico(self, desde: date | None = None, limit: int = 90) -> list[dict]:
        rows = self.historico
        if desde:
            rows = [r for r in rows if r["data_referencia"] >= desde.isoformat()]
        return rows[:limit]

    def get_ranking(self, personagem: str, ref_date: date | None = None) -> list[dict]:
        if ref_date:
            return self.rankings.get((personagem, ref_date), [])
        return []

    def get_latest_resultado(self) -> dict | None:
        return self.latest_resultado

    def get_latest_snapshot(self, janela: str) -> dict | None:
        return self.snapshots.get(janela)

    def get_snapshots(self, janela: str, limit: int = 12, desde: date | None = None) -> list[dict]:
        snap = self.snapshots.get(janela)
        return [snap] if snap else []

    def insert(self, table: str, data: dict) -> dict:
        row = {**data, "id": f"fake-{len(self.inserts)}"}
        self.inserts.append((table, row))
        return row

    def cache_snapshot(self, _janela: str, _row: dict) -> None:
        return None

    def rpc(self, _fn: str, _params: dict) -> list[dict]:
        return []

    def get_active_parametros_fase(self) -> dict | None:
        return None

    def exists_resultado_for_date(self, _ref: date) -> bool:
        return False


@pytest.fixture
def admin_headers() -> dict[str, str]:
    from motor.config import get_settings

    return {"X-Admin-Key": get_settings().admin_api_key}
