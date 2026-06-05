from __future__ import annotations

import asyncio
from datetime import date, datetime

import typer

from motor.logging_setup import setup_logging
from motor.pipeline.hybrid_analysis import HybridAnalysisEngine
from motor.pipeline.orchestrator import DailyOrchestrator
from motor.pipeline.synthesis import SynthesisEngine
from motor.schemas.validator import get_validator

app = typer.Typer(name="motor-cli", help="Motor de IA — Engenharia de Sinais Históricos")


def _parse_date(value: str | None) -> date:
    if not value:
        return date.today()
    return datetime.strptime(value, "%Y-%m-%d").date()


@app.callback()
def main() -> None:
    setup_logging()


@app.command("run-daily")
def run_daily(
    ref_date: str | None = typer.Option(None, "--date", help="YYYY-MM-DD"),
    force: bool = typer.Option(False, "--force"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Ativa LLM_DRY_RUN"),
) -> None:
    """Executa pipeline diário completo (9 camadas)."""
    if dry_run:
        import os

        os.environ["LLM_DRY_RUN"] = "true"
        from motor.config import get_settings

        get_settings.cache_clear()

    orchestrator = DailyOrchestrator()
    result = asyncio.run(orchestrator.run_daily(_parse_date(ref_date), force=force))
    typer.echo(
        f"Fase: {result.get('fase_atual', 'N/A')} | Índice: {result.get('indice_global', 0)}"
    )


@app.command("run-synthesis")
def run_synthesis(
    window: str = typer.Option(
        "weekly",
        "--window",
        help="weekly|monthly|quarterly|semiannual|annual",
    ),
) -> None:
    """Motor Nível 2 — síntese de padrões por janela temporal."""
    engine = SynthesisEngine()
    result = asyncio.run(engine.run(window))
    typer.echo(f"Síntese {window}: {result.get('analise_ia', {}).get('resumo', 'ok')}")


@app.command("run-hybrid-analysis")
def run_hybrid_analysis(
    window: str = typer.Option(
        "annual",
        "--window",
        help="quarterly|semiannual|annual",
    ),
) -> None:
    """Motor Nível 3 — análise híbrida multi-janela + RAG teológico."""
    engine = HybridAnalysisEngine()
    result = asyncio.run(engine.run(window))
    panorama = result.get("analise_hibrida", {}).get("panorama", "ok")
    typer.echo(f"Híbrido {window}: {str(panorama)[:120]}")


@app.command("ingest-only")
def ingest_only() -> None:
    """Apenas Camada 1 — coleta de documentos."""
    from motor.adapters.supabase import get_supabase
    from motor.pipeline.ingestion.collector import IngestionCollector

    collector = IngestionCollector()
    docs = asyncio.run(collector.collect_all())
    saved = collector.persist(get_supabase(), docs)
    typer.echo(f"Ingeridos {len(saved)} documentos.")


@app.command("seed-baseline")
def seed_baseline(
    force: bool = typer.Option(False, "--force", help="Reaplica seed do baseline histórico"),
) -> None:
    """Camada 0 — overview de profecias cumpridas antes do monitoramento diário."""
    from motor.pipeline.historical_baseline import HistoricalBaselineService

    result = HistoricalBaselineService().ensure_initialized(force=force)
    stats = result.get("estatisticas", {})
    typer.echo(
        f"Baseline OK — {stats.get('profecias_cumpridas', 0)}/{stats.get('total_profecias_biblicas', 0)} "
        f"profecias cumpridas; {stats.get('profecias_pendentes', 0)} pendentes."
    )


@app.command("validate-schemas")
def validate_schemas() -> None:
    """Valida schemas JSON com payloads de exemplo."""
    v = get_validator()
    v.validate(
        "evento_estruturado",
        {
            "evento": "test",
            "regiao": "global",
            "grau_tensao": 0.5,
            "impacto_global": 0.5,
            "energia": "expansao",
            "dimensao": "macro",
        },
    )
    typer.echo("Schemas OK.")


@app.command("revert-day")
def revert_day(
    ref_date: str = typer.Option(..., "--date", help="YYYY-MM-DD"),
    motivo: str = typer.Option("revisao_manual", "--motivo"),
) -> None:
    """Insere registro corretivo sem apagar histórico."""
    from motor.adapters.supabase import get_supabase

    db = get_supabase()
    d = _parse_date(ref_date)
    rows = db.select(
        "resultados_escatologicos", filters={"data_referencia": d.isoformat()}, limit=1
    )
    if not rows:
        typer.echo("Nenhum resultado para reverter.")
        raise typer.Exit(1)
    original = rows[0].get("json_analise_ia", {})
    corrected = {
        **original,
        "status": "reverted",
        "revisao_humana": True,
        "motivo_reversao": motivo,
    }
    db.insert(
        "resultados_escatologicos",
        {
            "data_referencia": d.isoformat(),
            "fase_atual": original.get("fase_atual", "FASE_I"),
            "probabilidade_fase": original.get("probabilidade_fase", 0),
            "indice_global": original.get("indice_global", 0),
            "confianca": 0,
            "json_analise_ia": corrected,
        },
    )
    typer.echo(f"Registro corretivo inserido para {d}.")


@app.command("run-data-drift")
def run_data_drift() -> None:
    """Refinamento mensal de critérios de fase (data drift)."""
    from motor.pipeline.data_drift import DataDriftEngine

    result = asyncio.run(DataDriftEngine().run())
    typer.echo(f"Data drift: {result.get('analise', {}).get('resumo', 'ok')}")


@app.command("archive-cold-storage")
def archive_cold_storage(
    cutoff: str | None = typer.Option(None, "--cutoff", help="YYYY-MM-DD"),
) -> None:
    """Exporta histórico antigo para JSON/Parquet local."""
    from motor.pipeline.archive import ColdStorageArchiver

    d = _parse_date(cutoff) if cutoff else None
    result = ColdStorageArchiver().archive_before(d)
    typer.echo(f"Arquivados {result['archived_count']} registros em {result['json_path']}")


if __name__ == "__main__":
    app()
