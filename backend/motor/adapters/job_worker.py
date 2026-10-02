from __future__ import annotations

import asyncio
import json
from datetime import datetime
from typing import Any

import structlog

from motor.adapters.job_queue import QUEUE_KEY, RedisJobQueue
from motor.adapters.redis_client import get_redis
from motor.pipeline.hybrid_analysis import HybridAnalysisEngine
from motor.pipeline.orchestrator import DailyOrchestrator
from motor.pipeline.synthesis import SynthesisEngine

logger = structlog.get_logger()


class JobWorker:
    """Consome jobs enfileirados em Redis (BackgroundTasks + CLI worker)."""

    def __init__(self) -> None:
        self.queue = RedisJobQueue()
        self.redis = get_redis()

    def _pop(self) -> dict[str, Any] | None:
        if not self.redis.available or not self.redis._client:
            return None
        raw = self.redis._client.rpop(QUEUE_KEY)
        if not raw:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return None

    async def _dispatch(self, job: dict[str, Any]) -> dict[str, Any]:
        job_type = job.get("type", "")
        payload = job.get("payload") or {}
        if job_type == "run_daily":
            ref = payload.get("ref_date")
            d = datetime.strptime(ref, "%Y-%m-%d").date() if ref else None
            result = await DailyOrchestrator().run_daily(
                d, force=bool(payload.get("force", False))
            )
            return {"fase": result.get("fase_atual"), "indice": result.get("indice_global")}
        if job_type == "run_synthesis":
            window = payload.get("window", "weekly")
            result = await SynthesisEngine().run(window)
            return {"window": window, "ok": bool(result)}
        if job_type == "run_hybrid":
            window = payload.get("window", "annual")
            result = await HybridAnalysisEngine().run(window)
            return {"window": window, "ok": bool(result)}
        return {"skipped": True, "type": job_type}

    async def run(self, once: bool = False, max_jobs: int = 50) -> int:
        processed = 0
        while processed < max_jobs:
            job = self._pop()
            if not job:
                if once:
                    break
                await asyncio.sleep(2.0)
                if once:
                    break
                continue

            job_id = str(job.get("id", ""))
            try:
                data = await self._dispatch(job)
                self.queue.set_result(job_id, "complete", data)
                logger.info("job_complete", job_id=job_id, type=job.get("type"))
            except Exception as exc:
                self.queue.set_result(job_id, "error", {"error": str(exc)})
                logger.warning("job_failed", job_id=job_id, error=str(exc))
            processed += 1
            if once:
                break
        return processed
