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
    dry_run: bool = typer.Option(False, "--dry-run", help="Ativa LLM_DRY_RUN"),
) -> None:
    """Motor Nível 2 — síntese de padrões por janela temporal."""
    if dry_run:
        import os

        os.environ["LLM_DRY_RUN"] = "true"
        from motor.config import get_settings

        get_settings.cache_clear()
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
    dry_run: bool = typer.Option(False, "--dry-run", help="Ativa LLM_DRY_RUN"),
) -> None:
    """Motor Nível 3 — análise híbrida multi-janela + RAG teológico."""
    if dry_run:
        import os

        os.environ["LLM_DRY_RUN"] = "true"
        from motor.config import get_settings

        get_settings.cache_clear()
    engine = HybridAnalysisEngine()
    result = asyncio.run(engine.run(window))
    panorama = result.get("analise_hibrida", {}).get("panorama", "ok")
    typer.echo(f"Híbrido {window}: {str(panorama)[:120]}")


@app.command("ingest-only")
def ingest_only() -> None:
    """Apenas Camada 1 — coleta de documentos."""
    from motor.adapters.postgres import get_postgres
    from motor.pipeline.ingestion.collector import IngestionCollector

    collector = IngestionCollector()
    docs = asyncio.run(collector.collect_all())
    saved = collector.persist(get_postgres(), docs)
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
    from motor.adapters.postgres import get_postgres

    db = get_postgres()
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
def run_data_drift(
    dry_run: bool = typer.Option(False, "--dry-run", help="Ativa LLM_DRY_RUN"),
) -> None:
    """Refinamento mensal de critérios de fase (data drift / embeddings_curation)."""
    if dry_run:
        import os

        os.environ["LLM_DRY_RUN"] = "true"
        from motor.config import get_settings

        get_settings.cache_clear()
    from motor.pipeline.data_drift import DataDriftEngine

    result = asyncio.run(DataDriftEngine().run())
    typer.echo(f"Data drift: {result.get('analise', {}).get('resumo', 'ok')}")


@app.command("run-drift-recalibration")
def run_drift_recalibration(
    dry_run: bool = typer.Option(False, "--dry-run", help="Ativa LLM_DRY_RUN"),
) -> None:
    """Alias de run-data-drift (recalibração de jargões / critérios)."""
    run_data_drift(dry_run=dry_run)


@app.command("archive-cold-storage")
def archive_cold_storage(
    cutoff: str | None = typer.Option(None, "--cutoff", help="YYYY-MM-DD (ignorado)"),
) -> None:
    """Política atual: retenção somente no Postgres (sem exportar arquivos/S3)."""
    from motor.pipeline.archive import ColdStorageArchiver

    d = _parse_date(cutoff) if cutoff else None
    result = ColdStorageArchiver().archive_before(d)
    typer.echo(result.get("message", "postgres_only"))


@app.command("export-extraction-dataset")
def export_extraction_dataset(
    out: str = typer.Option(
        "config/extraction_dataset.jsonl", "--out", help="Caminho do JSONL de saída"
    ),
    min_rows: int = typer.Option(0, "--min-rows", help="0 = usa DISTILL_MIN_ROWS"),
) -> None:
    """Exporta pares trecho↔extração LLM para destilação do classificador local."""
    from pathlib import Path

    from motor.adapters.postgres import get_postgres
    from motor.ml.distill import ExtractionDatasetExporter

    result = ExtractionDatasetExporter(get_postgres()).export(Path(out), min_rows=min_rows or None)
    if not result.get("ok"):
        typer.echo(result.get("message"))
        raise typer.Exit(1)
    typer.echo(f"Dataset: {result['n_rows']} exemplos → {result['path']}")


@app.command("train-event-classifier")
def train_event_classifier_cmd(
    dataset: str = typer.Option(
        "config/extraction_dataset.jsonl", "--dataset", help="JSONL do export"
    ),
    out_dir: str = typer.Option(
        "config/event_classifier", "--out-dir", help="Diretório dos artefatos"
    ),
) -> None:
    """Treina classificadores locais (BGE + sklearn) destilados da camada 4."""
    from pathlib import Path

    from motor.ml.distill import train_event_classifier

    result = train_event_classifier(Path(dataset), Path(out_dir))
    if not result.get("ok"):
        typer.echo(result.get("message"))
        raise typer.Exit(1)
    typer.echo(f"Treinado: {result['metrics']}")


@app.command("train-phase-hmm")
def train_phase_hmm(
    persist: bool = typer.Option(
        False, "--persist", help="Grava nova versão inativa em parametros_fase"
    ),
    limit: int = typer.Option(365, "--limit", help="Dias de histórico considerados"),
) -> None:
    """Treina o HMM de fases via EM (Baum-Welch) sobre o histórico diário.

    Com --persist grava versão inativa em `parametros_fase` — a ativação
    (`ativo=true`) é manual após revisão humana.
    """
    from motor.adapters.postgres import get_postgres
    from motor.config import get_settings
    from motor.math.hmm import PhaseHMM, observations_from_resultados

    settings = get_settings()
    db = get_postgres()
    rows = db.get_historico(limit=limit)
    observations = observations_from_resultados(rows)
    if len(observations) < settings.hmm_em_min_days:
        typer.echo(
            f"Histórico insuficiente: {len(observations)} dias "
            f"< {settings.hmm_em_min_days} (HMM_EM_MIN_DAYS)"
        )
        raise typer.Exit(1)

    hmm = PhaseHMM.from_db(db)
    result = hmm.fit(observations)
    typer.echo(f"EM: {result}")
    if persist and result.get("ok"):
        versao = db.next_parametros_fase_versao()
        db.insert_parametros_fase(
            versao=versao,
            emissoes=hmm.emissionprob.tolist(),
            transicoes={
                "startprob": hmm.startprob.tolist(),
                "matrix": hmm.transmat.tolist(),
            },
        )
        typer.echo(
            f"parametros_fase v{versao} gravado inativo — "
            "ative manualmente após revisão (ativo=true)"
        )


@app.command("train-gnn")
def train_gnn(
    epochs: int = typer.Option(0, "--epochs", help="0 = usa GNN_TRAIN_EPOCHS"),
    out: str = typer.Option("", "--out", help="Caminho dos pesos (default: GNN_WEIGHTS_PATH)"),
) -> None:
    """Treina o PropheticGNN por link prediction sobre o grafo persistido.

    Auto-supervisionado: arestas reais de `grafo_arestas` são os positivos.
    Requer `pip install -e '.[gnn]'` (torch + torch_geometric).
    """
    from pathlib import Path

    from motor.config import get_settings
    from motor.ml.gnn import PropheticGNN
    from motor.pipeline.graph_service import GraphService

    settings = get_settings()
    graph = GraphService().load_graph().graph
    gnn = PropheticGNN(graph)
    if gnn.backend == "numpy_proxy":
        typer.echo("torch_geometric não instalado — pip install -e '.[gnn]'")
        raise typer.Exit(1)

    result = gnn.train_link_prediction(epochs=epochs or None)
    if not result.get("ok"):
        typer.echo(result.get("message", "falha no treino"))
        raise typer.Exit(1)

    path = Path(out) if out else settings.gnn_weights_path
    gnn.save_weights(path, meta=result)
    typer.echo(f"Treinado: {result} → {path}")


@app.command("worker-jobs")
def worker_jobs(
    once: bool = typer.Option(False, "--once", help="Processa um job e encerra"),
    max_jobs: int = typer.Option(50, "--max-jobs"),
) -> None:
    """Worker Redis: consome fila motor:jobs:pending (substituto leve de Celery)."""
    from motor.adapters.job_worker import JobWorker

    worker = JobWorker()
    processed = asyncio.run(worker.run(once=once, max_jobs=max_jobs))
    typer.echo(f"Jobs processados: {processed}")


if __name__ == "__main__":
    app()
