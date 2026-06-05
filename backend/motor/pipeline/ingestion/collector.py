from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

import feedparser
import httpx
import structlog
import yaml

from motor.config import CONFIG_DIR, get_settings

logger = structlog.get_logger()


@dataclass
class RawDocument:
    titulo: str
    conteudo: str
    fonte: str
    url: str
    categoria: str
    coletado_em: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    content_hash: str = ""

    def __post_init__(self) -> None:
        if not self.content_hash:
            normalized = re.sub(r"\s+", " ", self.conteudo.strip().lower())
            self.content_hash = hashlib.sha256(normalized.encode()).hexdigest()


class IngestionCollector:
    def __init__(self) -> None:
        self.settings = get_settings()

    def _load_feeds(self) -> list[dict[str, str]]:
        path = self.settings.feeds_config_path
        if not path.exists():
            path = CONFIG_DIR / "feeds.yaml"
        with path.open(encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return data.get("feeds", [])

    async def collect_rss(self) -> list[RawDocument]:
        docs: list[RawDocument] = []
        for feed in self._load_feeds():
            try:
                parsed = feedparser.parse(feed["url"])
                for entry in parsed.entries[:10]:
                    content = entry.get("summary", entry.get("title", ""))
                    docs.append(
                        RawDocument(
                            titulo=entry.get("title", "Sem título"),
                            conteudo=content,
                            fonte=f"rss:{feed['name']}",
                            url=entry.get("link", ""),
                            categoria=feed.get("categoria", "geral"),
                        )
                    )
            except Exception as exc:
                logger.warning("rss_feed_failed", feed=feed.get("name"), error=str(exc))
        return docs

    async def collect_gdelt(self) -> list[RawDocument]:
        docs: list[RawDocument] = []
        query = "middle east conflict OR digital currency OR religious persecution"
        url = (
            "https://api.gdeltproject.org/api/v2/doc/doc"
            f"?query={query}&mode=ArtList&maxrecords=15&format=json"
        )
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url)
                if response.status_code != 200:
                    return self._gdelt_fallback()
                data = response.json()
                for art in data.get("articles", [])[: self.settings.max_documents_per_day]:
                    docs.append(
                        RawDocument(
                            titulo=art.get("title", "GDELT"),
                            conteudo=art.get("seendate", "") + " " + art.get("title", ""),
                            fonte="gdelt",
                            url=art.get("url", ""),
                            categoria="geopolitica",
                        )
                    )
        except Exception as exc:
            logger.warning("gdelt_failed", error=str(exc))
            return self._gdelt_fallback()
        return docs

    def _gdelt_fallback(self) -> list[RawDocument]:
        return [
            RawDocument(
                titulo="Tensão geopolítica no Oriente Médio persiste",
                conteudo=(
                    "Relatos indicam intensificação de conflitos regionais e "
                    "negociações multilaterais em curso."
                ),
                fonte="gdelt:fallback",
                url="",
                categoria="oriente_medio",
            )
        ]

    async def collect_acled(self) -> list[RawDocument]:
        if not self.settings.acled_api_key or not self.settings.acled_email:
            return []

        url = "https://api.acleddata.com/acled/read"
        params = {
            "key": self.settings.acled_api_key,
            "email": self.settings.acled_email,
            "limit": min(20, self.settings.max_documents_per_day),
            "event_type": "Battles|Explosions/Remote violence|Violence against civilians",
        }
        docs: list[RawDocument] = []
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)
                if response.status_code != 200:
                    logger.warning("acled_http_error", status=response.status_code)
                    return []
                payload = response.json()
                for evt in payload.get("data", [])[: params["limit"]]:
                    titulo = evt.get("event_type", "ACLED") + " — " + evt.get("country", "")
                    conteudo = (
                        f"{evt.get('event_date', '')} {evt.get('location', '')} "
                        f"{evt.get('actor1', '')} vs {evt.get('actor2', '')} "
                        f"fatalities={evt.get('fatalities', 0)}"
                    )
                    docs.append(
                        RawDocument(
                            titulo=titulo.strip(),
                            conteudo=conteudo.strip(),
                            fonte="acled",
                            url=evt.get("source", "") or "",
                            categoria="conflito",
                        )
                    )
        except Exception as exc:
            logger.warning("acled_failed", error=str(exc))
        return docs

    async def collect_all(self) -> list[RawDocument]:
        from motor.pipeline.ingestion.extended_sources import (
            collect_api_bible,
            collect_google_trends,
            collect_pdfs_from_dir,
            collect_reddit,
            collect_wef_cbdc,
        )
        from motor.pipeline.preprocessing.dedup import is_semantic_duplicate

        rss = await self.collect_rss()
        gdelt = await self.collect_gdelt()
        acled = await self.collect_acled()
        pdfs = await collect_pdfs_from_dir()
        bible = await collect_api_bible()
        reddit = await collect_reddit()
        trends = await collect_google_trends()
        wef_cbdc = await collect_wef_cbdc()
        all_docs = rss + gdelt + acled + pdfs + bible + reddit + trends + wef_cbdc
        hash_seen: set[str] = set()
        semantic_seen: set[str] = set()
        unique: list[RawDocument] = []
        for doc in all_docs:
            if doc.content_hash in hash_seen:
                continue
            if is_semantic_duplicate(doc.conteudo, semantic_seen):
                continue
            hash_seen.add(doc.content_hash)
            unique.append(doc)
        return unique[: self.settings.max_documents_per_day]

    def persist(self, db: Any, docs: list[RawDocument]) -> list[dict[str, Any]]:
        saved = []
        for doc in docs:
            row = db.insert(
                "documentos_brutos",
                {
                    "titulo": doc.titulo,
                    "conteudo": doc.conteudo,
                    "fonte": doc.fonte,
                    "url": doc.url,
                    "categoria": doc.categoria,
                    "content_hash": doc.content_hash,
                    "coletado_em": doc.coletado_em,
                },
            )
            saved.append(row)
        return saved
