from __future__ import annotations

import json
import uuid
from typing import Any

from motor.adapters.redis_client import get_redis

QUEUE_KEY = "motor:jobs:pending"
RESULT_PREFIX = "motor:jobs:result:"


class RedisJobQueue:
    """Fila leve de jobs em Redis (substituto inicial de Celery/RabbitMQ)."""

    def __init__(self) -> None:
        self.redis = get_redis()

    @property
    def available(self) -> bool:
        return self.redis.available

    def enqueue(self, job_type: str, payload: dict[str, Any] | None = None) -> str:
        job_id = str(uuid.uuid4())
        if not self.available:
            return job_id
        body = json.dumps({"id": job_id, "type": job_type, "payload": payload or {}})
        client = self.redis._client
        if client:
            client.lpush(QUEUE_KEY, body)
            client.setex(f"{RESULT_PREFIX}{job_id}", 86400, json.dumps({"status": "queued"}))
        return job_id

    def set_result(self, job_id: str, status: str, data: dict[str, Any] | None = None) -> None:
        if not self.available:
            return
        client = self.redis._client
        if client:
            client.setex(
                f"{RESULT_PREFIX}{job_id}",
                86400,
                json.dumps({"status": status, "data": data or {}}),
            )

    def get_result(self, job_id: str) -> dict[str, Any] | None:
        if not self.available:
            return None
        raw = self.redis.get(f"{RESULT_PREFIX}{job_id}")
        if not raw:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return None
