from __future__ import annotations

import asyncio
from datetime import date, datetime

from fastapi import (
    BackgroundTasks,
    Depends,
    FastAPI,
    Header,
    HTTPException,
    Query,
    Request,
    Response,
)
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from motor.adapters.job_queue import RedisJobQueue
from motor.adapters.supabase import get_supabase
from motor.config import get_settings
from motor.logging_setup import setup_logging
from motor.pipeline.fulfillment_tracker import FulfillmentTracker
from motor.pipeline.graph_service import GraphService
from motor.pipeline.historical_baseline import HistoricalBaselineService
from motor.pipeline.hybrid_analysis import HybridAnalysisEngine
from motor.pipeline.orchestrator import DailyOrchestrator
from motor.pipeline.reports.generator import ReportGenerator
from motor.pipeline.synthesis import SynthesisEngine

setup_logging()
settings = get_settings()
limiter = Limiter(key_func=get_remote_address, default_limits=[settings.api_rate_limit])

app = FastAPI(
    title="Motor Escatológico API",
    version="0.1.0",
    description="API de leitura e administração do motor de sinais históricos.",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def verify_admin(x_admin_key: str = Header(default="")) -> None:
    if x_admin_key != settings.admin_api_key:
        raise HTTPException(status_code=401, detail="Chave admin inválida")


@app.get("/health")
@limiter.limit(settings.api_rate_limit)
async def health(request: Request) -> dict:
    return {"status": "ok", "service": "motor-escatologico"}


@app.get("/api/v1/baseline/historico")
@limiter.limit(settings.api_rate_limit)
async def baseline_historico(request: Request) -> dict:
    """Overview de profecias cumpridas (Camada 0) — ~1.819 profecias / ~600 eventos."""
    overview = HistoricalBaselineService().get_overview()
    if not overview:
        overview = HistoricalBaselineService().ensure_initialized()
    return overview


@app.get("/api/v1/baseline/arquivo")
@limiter.limit(settings.api_rate_limit)
async def baseline_arquivo(
    request: Request,
    status: str | None = Query(None, description="cumprida|parcial|pendente"),
    limit: int = Query(100, ge=1, le=500),
) -> list[dict]:
    db = get_supabase()
    filters = {"status": status} if status else None
    return db.select("arquivo_profetico", filters=filters, limit=limit)


@app.get("/api/v1/baseline/atualizacoes")
@limiter.limit(settings.api_rate_limit)
async def baseline_atualizacoes(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
) -> list[dict]:
    """Profecias detectadas como cumpridas/parciais após o baseline inicial."""
    return FulfillmentTracker().get_atualizacoes(limit=limit)


@app.get("/api/v1/resultado/atual")
@limiter.limit(settings.api_rate_limit)
async def resultado_atual(request: Request) -> dict:
    db = get_supabase()
    row = db.get_latest_resultado()
    if not row:
        raise HTTPException(status_code=404, detail="Nenhum resultado disponível")
    return row.get("json_analise_ia", row)


@app.get("/api/v1/resultado/historico")
@limiter.limit(settings.api_rate_limit)
async def resultado_historico(
    request: Request,
    desde: str | None = Query(None, description="YYYY-MM-DD"),
    limit: int = Query(90, ge=1, le=365),
) -> list[dict]:
    db = get_supabase()
    desde_date = datetime.strptime(desde, "%Y-%m-%d").date() if desde else None
    rows = db.get_historico(desde=desde_date, limit=limit)
    return [r.get("json_analise_ia", r) for r in rows]


@app.get("/api/v1/ranking/{personagem}")
@limiter.limit(settings.api_rate_limit)
async def ranking(
    request: Request,
    personagem: str,
    data: str | None = Query(None, description="YYYY-MM-DD"),
) -> list[dict]:
    if personagem not in ("besta_mar", "besta_terra", "mar", "terra"):
        raise HTTPException(status_code=400, detail="personagem deve ser besta_mar ou besta_terra")
    key = "besta_mar" if personagem in ("besta_mar", "mar") else "besta_terra"
    db = get_supabase()
    ref = datetime.strptime(data, "%Y-%m-%d").date() if data else None
    rows = db.get_ranking(key, ref)
    if rows:
        return rows
    latest = db.get_latest_resultado()
    if latest:
        payload = latest.get("json_analise_ia", {})
        return payload.get("ranking_mar" if key == "besta_mar" else "ranking_terra", [])
    return []


@app.get("/api/v1/snapshot/{janela}")
@limiter.limit(settings.api_rate_limit)
async def snapshot_atual(request: Request, janela: str) -> dict:
    db = get_supabase()
    row = db.get_latest_snapshot(janela)
    if not row:
        raise HTTPException(status_code=404, detail=f"Nenhum snapshot para janela {janela}")
    return row.get("dados", row)


@app.get("/api/v1/snapshot/{janela}/historico")
@limiter.limit(settings.api_rate_limit)
async def snapshot_historico(
    request: Request,
    janela: str,
    limit: int = Query(12, ge=1, le=52),
) -> list[dict]:
    db = get_supabase()
    rows = db.get_snapshots(janela, limit=limit)
    return [r.get("dados", r) for r in rows]


@app.post("/api/v1/admin/run-synthesis")
@limiter.limit("5/minute")
async def admin_run_synthesis(
    request: Request,
    background_tasks: BackgroundTasks,
    _: None = Depends(verify_admin),
    window: str = Query("weekly"),
) -> dict:
    allowed = {"weekly", "monthly", "quarterly", "semiannual", "annual"}
    if window not in allowed:
        raise HTTPException(status_code=400, detail=f"window deve ser um de {sorted(allowed)}")

    queue = RedisJobQueue()
    job_id = queue.enqueue("run_synthesis", {"window": window})

    async def _run() -> None:
        try:
            result = await SynthesisEngine().run(window)
            queue.set_result(
                job_id, "complete", {"window": window, "summary": result.get("analise_ia")}
            )
        except Exception as exc:
            queue.set_result(job_id, "error", {"error": str(exc)})

    background_tasks.add_task(lambda: asyncio.run(_run()))
    return {"status": "accepted", "motor": "nivel_2", "window": window, "job_id": job_id}


@app.post("/api/v1/admin/run-hybrid-analysis")
@limiter.limit("3/minute")
async def admin_run_hybrid(
    request: Request,
    background_tasks: BackgroundTasks,
    _: None = Depends(verify_admin),
    window: str = Query("annual"),
) -> dict:
    allowed = {"quarterly", "semiannual", "annual"}
    if window not in allowed:
        raise HTTPException(status_code=400, detail=f"window deve ser um de {sorted(allowed)}")

    queue = RedisJobQueue()
    job_id = queue.enqueue("run_hybrid", {"window": window})

    async def _run() -> None:
        try:
            await HybridAnalysisEngine().run(window)
            queue.set_result(job_id, "complete", {"window": window})
        except Exception as exc:
            queue.set_result(job_id, "error", {"error": str(exc)})

    background_tasks.add_task(lambda: asyncio.run(_run()))
    return {"status": "accepted", "motor": "nivel_3", "window": window, "job_id": job_id}


@app.get("/api/v1/grafo")
@limiter.limit(settings.api_rate_limit)
async def grafo(request: Request) -> dict:
    return GraphService().to_api_payload()


@app.get("/api/v1/cenarios")
@limiter.limit(settings.api_rate_limit)
async def cenarios(request: Request) -> list[dict]:
    return GraphService().build_cenarios()


@app.get("/api/v1/relatorio/pdf")
@limiter.limit(settings.api_rate_limit)
async def relatorio_pdf(request: Request) -> Response:
    db = get_supabase()
    row = db.get_latest_resultado()
    if not row:
        raise HTTPException(status_code=404, detail="Nenhum resultado disponível")
    payload = row.get("json_analise_ia", row)
    try:
        pdf = ReportGenerator().generate_pdf_bytes(payload)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="relatorio-escatologico.pdf"'},
    )


@app.get("/api/v1/admin/jobs/{job_id}")
@limiter.limit(settings.api_rate_limit)
async def job_status(request: Request, job_id: str, _: None = Depends(verify_admin)) -> dict:
    result = RedisJobQueue().get_result(job_id)
    if not result:
        raise HTTPException(status_code=404, detail="Job não encontrado")
    return result


@app.post("/api/v1/admin/approve-review")
@limiter.limit("10/minute")
async def approve_review(
    request: Request,
    _: None = Depends(verify_admin),
    data_referencia: str = Query(..., description="YYYY-MM-DD"),
) -> dict:
    db = get_supabase()
    rows = db.select(
        "resultados_escatologicos",
        filters={"data_referencia": data_referencia},
        limit=1,
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Resultado não encontrado")
    row = rows[0]
    payload = row.get("json_analise_ia", {})
    payload["revisao_humana"] = True
    payload["status"] = "complete"
    if db.is_configured:
        db._client.table("resultados_escatologicos").update({"json_analise_ia": payload}).eq(
            "id", row["id"]
        ).execute()
    return {"status": "approved", "data_referencia": data_referencia}


@app.post("/api/v1/admin/run-daily")
@limiter.limit("5/minute")
async def admin_run_daily(
    request: Request,
    background_tasks: BackgroundTasks,
    _: None = Depends(verify_admin),
    ref_date: str | None = Query(None),
    force: bool = Query(False),
) -> dict:
    d = datetime.strptime(ref_date, "%Y-%m-%d").date() if ref_date else date.today()

    queue = RedisJobQueue()
    job_id = queue.enqueue("run_daily", {"ref_date": d.isoformat(), "force": force})

    async def _run() -> None:
        try:
            result = await DailyOrchestrator().run_daily(d, force=force)
            queue.set_result(job_id, "complete", {"fase": result.get("fase_atual")})
        except Exception as exc:
            queue.set_result(job_id, "error", {"error": str(exc)})

    background_tasks.add_task(lambda: asyncio.run(_run()))
    return {"status": "accepted", "data_referencia": d.isoformat(), "job_id": job_id}
