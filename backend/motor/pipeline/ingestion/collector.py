from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
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

    def _load_yaml(self) -> dict[str, Any]:
        path = self.settings.feeds_config_path
        if not path.exists():
            path = CONFIG_DIR / "feeds.yaml"
        with path.open(encoding="utf-8") as f:
            return yaml.safe_load(f) or {}

    def _load_feeds(self) -> list[dict[str, str]]:
        return self._load_yaml().get("feeds", [])

    def _gdelt_query(self) -> str:
        themes = self._load_yaml().get("gdelt_themes") or []
        theme_q = " OR ".join(str(t) for t in themes[:8]) if themes else ""
        base = (
            "middle east conflict OR digital currency OR religious persecution "
            "OR (UFO OR UAP OR extraterrestrial disclosure) "
            "OR (false prophet OR apocalyptic deception OR lying signs)"
        )
        return f"({base}) OR ({theme_q})" if theme_q else base

    async def _fetch_article_snippet(self, client: httpx.AsyncClient, url: str) -> str:
        if not url or not url.startswith("http"):
            return ""
        try:
            r = await client.get(url, follow_redirects=True, timeout=8.0)
            if r.status_code != 200 or not r.text:
                return ""
            text = re.sub(r"<[^>]+>", " ", r.text)
            text = re.sub(r"\s+", " ", text).strip()
            return text[:1200]
        except Exception:
            return ""

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
        query = self._gdelt_query()
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
                    art_url = art.get("url", "")
                    body = await self._fetch_article_snippet(client, art_url)
                    conteudo = (
                        f"{art.get('seendate', '')} {art.get('title', '')} {body}".strip()
                    )
                    docs.append(
                        RawDocument(
                            titulo=art.get("title", "GDELT"),
                            conteudo=conteudo,
                            fonte="gdelt",
                            url=art_url,
                            categoria="geopolitica",
                        )
                    )
        except Exception as exc:
            logger.warning("gdelt_failed", error=str(exc))
            return self._gdelt_fallback()
        return docs if docs else self._gdelt_fallback()

    def _gdelt_fallback(self) -> list[RawDocument]:
        if not self.settings.allow_gdelt_synthetic_fallback:
            logger.warning("gdelt_fallback_disabled")
            return []
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

    def _acled_seed_docs(self) -> list[RawDocument]:
        path = CONFIG_DIR / "acled_seed.json"
        if not path.exists():
            return []
        import json

        with path.open(encoding="utf-8") as f:
            rows = json.load(f)
        docs: list[RawDocument] = []
        for evt in rows:
            titulo = f"{evt.get('event_type', 'ACLED')} — {evt.get('country', '')}"
            conteudo = (
                f"{evt.get('event_date', '')} {evt.get('location', '')} "
                f"{evt.get('actor1', '')} vs {evt.get('actor2', '')} "
                f"fatalities={evt.get('fatalities', 0)} {evt.get('notes', '')}"
            )
            docs.append(
                RawDocument(
                    titulo=titulo.strip(),
                    conteudo=conteudo.strip(),
                    fonte="acled:seed",
                    url="",
                    categoria="conflito",
                )
            )
        return docs

    async def collect_acled(self) -> list[RawDocument]:
        if not self.settings.acled_api_key or not self.settings.acled_email:
            seed = self._acled_seed_docs()
            if seed:
                logger.info("acled_using_seed", n=len(seed))
            return seed

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
                    return self._acled_seed_docs()
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
            return self._acled_seed_docs()
        return docs or self._acled_seed_docs()

    async def collect_ocr_images(self) -> list[RawDocument]:
        from motor.pipeline.preprocessing.ocr import extract_text_from_image

        raw_dir = self.settings.ocr_images_dir
        if not raw_dir:
            raw_dir = CONFIG_DIR / "images"
        path = Path(raw_dir)
        if not path.exists():
            return []
        docs: list[RawDocument] = []
        for img in list(path.glob("*.png")) + list(path.glob("*.jpg")) + list(path.glob("*.jpeg")):
            text = extract_text_from_image(img)
            if not text or len(text) < 20:
                continue
            docs.append(
                RawDocument(
                    titulo=f"OCR {img.name}",
                    conteudo=text[:4000],
                    fonte="ocr:image",
                    url=str(img),
                    categoria="documento",
                )
            )
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
        ocr = await self.collect_ocr_images()
        bible = await collect_api_bible()
        reddit = await collect_reddit()
        trends = await collect_google_trends()
        wef_cbdc = await collect_wef_cbdc()
        all_docs = rss + gdelt + acled + pdfs + ocr + bible + reddit + trends + wef_cbdc
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
        if self.settings.semantic_dedup_enabled:
            unique = self._semantic_dedup(unique)
        return unique[: self.settings.max_documents_per_day]

    def _semantic_dedup(self, docs: list[RawDocument]) -> list[RawDocument]:
        """Dedup por similaridade de embedding (cosseno > threshold).

        Complementa o dedup por hash: captura reescritas do mesmo conteúdo.
        Sem modelo de embedding disponível, retorna a lista intacta.
        """
        try:
            import numpy as np

            from motor.pipeline.embeddings.service import EmbeddingService
        except ImportError:
            return docs

        emb = EmbeddingService()
        if not emb.is_available:
            return docs
        try:
            vecs = emb.embed_texts([d.conteudo[:1000] for d in docs])
        except Exception as exc:
            logger.warning("semantic_dedup_failed", error=str(exc))
            return docs

        thr = float(self.settings.semantic_dedup_threshold)
        kept: list[RawDocument] = []
        seen: list = []
        for doc, vec in zip(docs, vecs, strict=True):
            v = np.array(vec, dtype=float)
            norm = np.linalg.norm(v)
            is_dup = norm > 1e-9 and any(
                float(np.dot(v, s) / (norm * np.linalg.norm(s))) > thr for s in seen
            )
            if is_dup:
                logger.info(
                    "semantic_dedup_drop", fonte=doc.fonte, titulo=doc.titulo[:60]
                )
                continue
            seen.append(v)
            kept.append(doc)
        return kept

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
