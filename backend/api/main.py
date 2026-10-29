from __future__ import annotations

import asyncio
import json
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
from pywebpush import WebPushException, webpush
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from motor.adapters.job_queue import RedisJobQueue
from motor.adapters.postgres import get_postgres
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
    db = get_postgres()
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
    db = get_postgres()
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
    db = get_postgres()
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
    db = get_postgres()
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
    db = get_postgres()
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
    db = get_postgres()
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


@app.post("/api/v1/cenarios/what-if")
@limiter.limit("20/minute")
async def cenarios_what_if(request: Request) -> dict:
    """Simulação what-if / Monte Carlo sobre cenários ativos."""
    from motor.pipeline.scenario_whatif import ScenarioWhatIfSimulator

    body: dict = {}
    try:
        body = await request.json()
    except Exception:
        body = {}
    active_ids = body.get("ativos") or body.get("active_ids") or []
    if not isinstance(active_ids, list):
        raise HTTPException(status_code=400, detail="ativos deve ser lista de ids")
    base = float(body.get("base_indice", 0.58))
    trials = int(body.get("trials", 200))
    return ScenarioWhatIfSimulator().simulate(
        active_ids=[str(x) for x in active_ids],
        base_indice=base,
        trials=trials,
    )


@app.get("/api/v1/ameacas/paises")
@limiter.limit(settings.api_rate_limit)
async def ameacas_paises(
    request: Request,
    data: str | None = Query(None, description="YYYY-MM-DD"),
) -> list[dict]:
    db = get_postgres()
    ref = datetime.strptime(data, "%Y-%m-%d").date() if data else None
    if ref:
        rows = db.select(
            "ameacas_pais",
            filters={"data_referencia": ref.isoformat()},
            order="-risk_score",
        )
        if rows:
            return rows
    latest = db.get_latest_resultado()
    if latest:
        payload = latest.get("json_analise_ia") or {}
        return payload.get("ameacas_paises") or []
    rows = db.select("ameacas_pais", order="-data_referencia", limit=50)
    return rows


@app.post("/api/v1/missiological/analyze")
@limiter.limit("10/minute")
async def missiological_analyze(request: Request) -> dict:
    from motor.pipeline.joshua_analysis import JoshuaAnalysisService

    db = get_postgres()
    rows = db.select("joshua_project_data", limit=300)
    svc = JoshuaAnalysisService()
    analyses = svc.analyze_many(rows)
    written = svc.persist(db, analyses) if analyses else 0
    return {
        "analyzed": len(analyses),
        "written": written,
        "countries": svc.country_aggregates(rows),
    }


@app.get("/api/v1/missiological/results")
@limiter.limit(settings.api_rate_limit)
async def missiological_results(
    request: Request,
    country: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
) -> list[dict]:
    db = get_postgres()
    filters = {"country_code": country.upper()} if country else None
    rows = db.select(
        "missiological_analysis",
        filters=filters,
        order="-analyzed_at",
        limit=limit,
    )
    if rows:
        return rows
    # Fallback: compute on the fly from raw Joshua rows
    from motor.pipeline.joshua_analysis import JoshuaAnalysisService

    raw = db.select(
        "joshua_project_data",
        filters={"country_code": country.upper()} if country else None,
        limit=limit,
    )
    return JoshuaAnalysisService().analyze_many(raw)


@app.get("/api/v1/ameacas/paises/{code}")
@limiter.limit(settings.api_rate_limit)
async def ameacas_pais_detail(
    request: Request,
    code: str,
    data: str | None = Query(None, description="YYYY-MM-DD"),
) -> dict:
    code = code.upper()
    db = get_postgres()
    filters: dict = {"country_code": code}
    if data:
        filters["data_referencia"] = data
    rows = db.select("ameacas_pais", filters=filters, order="-data_referencia", limit=1)
    threat = rows[0] if rows else None
    if not threat:
        latest = db.get_latest_resultado()
        payload = (latest or {}).get("json_analise_ia") or {}
        threat = next(
            (t for t in payload.get("ameacas_paises") or [] if t.get("country_code") == code),
            None,
        )
    if not threat:
        raise HTTPException(status_code=404, detail="País não encontrado")

    ref = threat.get("data_referencia") or data
    abm_filters: dict = {"country_code": code}
    adv_filters: dict = {"country_code": code}
    rec_filters: dict = {"country_code": code}
    if ref:
        abm_filters["data_referencia"] = ref
        adv_filters["data_referencia"] = ref
        rec_filters["data_referencia"] = ref
    abm_rows = db.select("simulacoes_abm", filters=abm_filters, limit=1)
    adv_rows = db.select("adversarial_reviews", filters=adv_filters, order="-created_at", limit=1)
    rec_rows = db.select("recomendacoes_adaptativas", filters=rec_filters, limit=5)
    latest = db.get_latest_resultado()
    payload = (latest or {}).get("json_analise_ia") or {}
    return {
        "ameaca": threat,
        "abm": (abm_rows[0].get("resultado") if abm_rows else None)
        or next(
            (s for s in payload.get("simulacoes_abm") or [] if s.get("country_code") == code),
            None,
        ),
        "adversarial": (adv_rows[0].get("payload") if adv_rows else None)
        or next(
            (a for a in payload.get("adversarial") or [] if a.get("country_code") == code),
            None,
        ),
        "recomendacoes": rec_rows
        or [
            r
            for r in payload.get("recomendacoes_adaptativas") or []
            if r.get("country_code") == code
        ],
        "provenance": payload.get("provenance"),
    }


@app.get("/api/v1/provenance/day/{day}")
@limiter.limit(settings.api_rate_limit)
async def provenance_day(request: Request, day: str) -> dict:
    from motor.pipeline.provenance import ProvenanceService

    db = get_postgres()
    try:
        datetime.strptime(day, "%Y-%m-%d")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="data inválida") from exc
    rows = db.select(
        "provenance_log",
        filters={"data_referencia": day},
        order="created_at",
    )
    verification = ProvenanceService().verify_chain(rows)
    latest = db.get_latest_resultado()
    payload_prov = None
    if latest:
        latest_date = str(latest.get("data_referencia", ""))
        if latest_date.startswith(day):
            payload_prov = (latest.get("json_analise_ia") or {}).get("provenance")
    return {
        "data_referencia": day,
        "entries": rows,
        "verification": verification,
        "payload_provenance": payload_prov,
    }


@app.get("/api/v1/relatorio/pdf")
@limiter.limit(settings.api_rate_limit)
async def relatorio_pdf(request: Request) -> Response:
    db = get_postgres()
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
    db = get_postgres()
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
    payload["revisao_aprovada_em"] = datetime.now().isoformat()
    db.update("resultados_escatologicos", {"id": row["id"]}, {"json_analise_ia": payload})
    return {"status": "approved", "data_referencia": data_referencia}


@app.post("/api/v1/admin/reject-review")
@limiter.limit("10/minute")
async def reject_review(
    request: Request,
    _: None = Depends(verify_admin),
    data_referencia: str = Query(..., description="YYYY-MM-DD"),
) -> dict:
    """Rejeita transição de fase — mantém registro append-only com status rejected."""
    db = get_postgres()
    rows = db.select(
        "resultados_escatologicos",
        filters={"data_referencia": data_referencia},
        limit=1,
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Resultado não encontrado")
    row = rows[0]
    payload = dict(row.get("json_analise_ia") or {})
    payload["revisao_humana"] = True
    payload["status"] = "rejected"
    payload["revisao_rejeitada_em"] = datetime.now().isoformat()
    payload["revisao_motivo"] = "Rejeitado na revisão humana — transição não publicada."
    db.update("resultados_escatologicos", {"id": row["id"]}, {"json_analise_ia": payload})
    return {"status": "rejected", "data_referencia": data_referencia}


@app.get("/api/v1/admin/propostas-ajuste")
@limiter.limit("30/minute")
async def list_propostas(
    request: Request,
    _: None = Depends(verify_admin),
    status: str | None = Query(None, description="pendente|aprovada|rejeitada|aplicada"),
    limit: int = Query(50, ge=1, le=200),
) -> dict:
    """Lista propostas de ajuste geradas por LLM aguardando revisão."""
    propostas = get_postgres().list_propostas_ajuste(status=status, limit=limit)
    return {"propostas": propostas, "count": len(propostas)}


@app.post("/api/v1/admin/propostas-ajuste/{proposta_id}/aprovar")
@limiter.limit("10/minute")
async def aprovar_proposta(
    request: Request,
    proposta_id: str,
    _: None = Depends(verify_admin),
    marcar_aplicada: bool = Query(
        False, description="true quando o ajuste já foi aplicado no alvo"
    ),
) -> dict:
    """Aprova proposta — a aplicação no alvo (JSON/config/tabela) é manual."""
    db = get_postgres()
    status = "aplicada" if marcar_aplicada else "aprovada"
    updated = db.set_proposta_status(proposta_id, status)
    if not updated:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    return {"status": status, "id": proposta_id}


@app.post("/api/v1/admin/propostas-ajuste/{proposta_id}/rejeitar")
@limiter.limit("10/minute")
async def rejeitar_proposta(
    request: Request,
    proposta_id: str,
    _: None = Depends(verify_admin),
    motivo: str = Query("", description="Motivo da rejeição"),
) -> dict:
    """Rejeita proposta — o registro permanece append-only com motivo."""
    db = get_postgres()
    updated = db.set_proposta_status(proposta_id, "rejeitada", motivo=motivo or None)
    if not updated:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    return {"status": "rejeitada", "id": proposta_id}


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


# ==================== Push Notifications ====================


@app.post("/api/push/subscribe")
@limiter.limit("10/minute")
async def push_subscribe(request: Request) -> dict:
    """Registra subscription de push notification do cliente."""
    try:
        body = await request.json()
        subscription_data = body.get("subscription")
        if not subscription_data:
            raise HTTPException(status_code=400, detail="subscription data required")

        endpoint = subscription_data.get("endpoint")
        if not endpoint:
            raise HTTPException(status_code=400, detail="endpoint required")

        db = get_postgres()
        # Upsert: se já existe, atualiza; se não, insere
        existing = db.select(
            "push_subscriptions",
            filters={"endpoint": endpoint},
            limit=1,
        )

        sub_record = {
            "endpoint": endpoint,
            "keys_p256dh": subscription_data.get("keys", {}).get("p256dh"),
            "keys_auth": subscription_data.get("keys", {}).get("auth"),
            "user_agent": request.headers.get("user-agent", "unknown"),
            "updated_at": datetime.now().isoformat(),
        }

        if existing:
            db.update("push_subscriptions", {"id": existing[0]["id"]}, sub_record)
        else:
            sub_record["created_at"] = datetime.now().isoformat()
            db.insert("push_subscriptions", sub_record)

        return {"status": "subscribed", "endpoint": endpoint}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/push/unsubscribe")
@limiter.limit("10/minute")
async def push_unsubscribe(request: Request) -> dict:
    """Remove subscription de push notification."""
    try:
        body = await request.json()
        subscription_data = body.get("subscription")
        if not subscription_data:
            raise HTTPException(status_code=400, detail="subscription data required")

        endpoint = subscription_data.get("endpoint")
        if not endpoint:
            raise HTTPException(status_code=400, detail="endpoint required")

        db = get_postgres()
        existing = db.select(
            "push_subscriptions",
            filters={"endpoint": endpoint},
            limit=1,
        )

        if existing:
            db.delete("push_subscriptions", {"id": existing[0]["id"]})
            return {"status": "unsubscribed", "endpoint": endpoint}

        return {"status": "not_found", "endpoint": endpoint}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/push/send")
@limiter.limit("20/minute")
async def push_send(
    request: Request,
    _: None = Depends(verify_admin),
) -> dict:
    """Envia notificação push para todos os subscribers (admin only)."""
    try:
        body = await request.json()
        title = body.get("title", "Atualização")
        message = body.get("message", "")
        url = body.get("url", "/")
        tag = body.get("tag", "sinais-update")

        if not settings.vapid_private_key or not settings.vapid_public_key:
            raise HTTPException(
                status_code=500,
                detail="VAPID keys not configured on server",
            )

        db = get_postgres()
        subscriptions = db.select("push_subscriptions")

        if not subscriptions:
            return {"status": "no_subscribers", "sent": 0}

        payload_dict = {
            "title": title,
            "body": message,
            "url": url,
            "tag": tag,
        }
        payload = json.dumps(payload_dict)

        success_count = 0
        error_count = 0

        for sub in subscriptions:
            try:
                subscription_info = {
                    "endpoint": sub["endpoint"],
                    "keys": {
                        "p256dh": sub["keys_p256dh"],
                        "auth": sub["keys_auth"],
                    },
                }

                webpush(
                    subscription_info=subscription_info,
                    data=payload,
                    vapid_private_key=settings.vapid_private_key,
                    vapid_claims={"sub": "mailto:admin@sinaishistoricos.com"},
                )
                success_count += 1
            except WebPushException as exc:
                error_count += 1
                # Remover subscription inválida
                db.delete("push_subscriptions", {"id": sub["id"]})
                print(f"Push failed for {sub['endpoint']}: {exc}")

        return {
            "status": "sent",
            "success": success_count,
            "errors": error_count,
            "total": len(subscriptions),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
