from datetime import date

from motor.pipeline.chronological_archive import ChronologicalArchiveService
from motor.pipeline.scenario_whatif import ScenarioWhatIfSimulator


class FakeDb:
    def __init__(self) -> None:
        self.rows: list[dict] = []

    def upsert(self, table: str, data: dict, on_conflict: str = "id") -> dict:
        self.rows.append({**data, "_table": table})
        return data

    def select(self, *args, **kwargs) -> list[dict]:
        return []


def test_catalog_daily_events_writes_arquivo_rows():
    db = FakeDb()
    svc = ChronologicalArchiveService(db=db)  # type: ignore[arg-type]
    n = svc.catalog_daily_events(
        date(2026, 6, 5),
        [
            {
                "evento": "conflito_militar",
                "regiao": "oriente_medio",
                "energia": "contracao",
                "dimensao": "macro",
                "descricao": "Tensão no Oriente Médio",
                "grau_tensao": 0.7,
                "impacto_global": 0.6,
            }
        ],
        "FASE_II",
    )
    assert n == 1
    assert db.rows[0]["categoria"] == "evento_diario"
    assert db.rows[0]["dados"]["origem"] == "run_diario"


def test_whatif_monte_carlo_bounds():
    class FakeGraph:
        def build_cenarios(self):
            return [
                {
                    "id": "a",
                    "titulo": "A",
                    "precondicoes": [],
                    "dependencias": [],
                    "impacto_indice": 0.1,
                    "fase_alvo": "FASE_II",
                }
            ]

    result = ScenarioWhatIfSimulator(graph=FakeGraph()).simulate(  # type: ignore[arg-type]
        active_ids=[],
        trials=50,
    )
    assert result["monte_carlo"]["p10"] <= result["monte_carlo"]["p90"]
    assert "fase_sugerida" in result
