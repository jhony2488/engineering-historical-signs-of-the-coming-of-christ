from __future__ import annotations

from typing import TYPE_CHECKING

import httpx
import structlog

from motor.config import CONFIG_DIR, get_settings
from motor.pipeline.ingestion.collector import RawDocument
from motor.pipeline.preprocessing.ocr import extract_text_from_pdf

if TYPE_CHECKING:
    pass

logger = structlog.get_logger()


async def collect_pdfs_from_dir() -> list[RawDocument]:
    pdf_dir = CONFIG_DIR / "pdfs"
    if not pdf_dir.exists():
        return []
    docs: list[RawDocument] = []
    for path in sorted(pdf_dir.glob("*.pdf"))[:5]:
        text = extract_text_from_pdf(path)
        if not text:
            continue
        docs.append(
            RawDocument(
                titulo=path.stem,
                conteudo=text[:8000],
                fonte=f"pdf:{path.name}",
                url="",
                categoria="documento",
            )
        )
    return docs


async def collect_api_bible() -> list[RawDocument]:
    settings = get_settings()
    if not settings.api_bible_key:
        return []
    passages = ["MAT.24.6-8", "2TH.2.3-4", "REV.13.7-8", "DAN.7.23-25"]
    docs: list[RawDocument] = []
    headers = {"api-key": settings.api_bible_key}
    async with httpx.AsyncClient(timeout=20.0) as client:
        for ref in passages:
            try:
                url = f"https://api.scripture.api.bible/v1/bibles/{settings.api_bible_id}/passages/{ref}"
                res = await client.get(url, headers=headers)
                if res.status_code != 200:
                    continue
                data = res.json()
                content = data.get("data", {}).get("content", "")
                if content:
                    docs.append(
                        RawDocument(
                            titulo=f"Escritura {ref}",
                            conteudo=content,
                            fonte="api.bible",
                            url=url,
                            categoria="teologia",
                        )
                    )
            except Exception as exc:
                logger.warning("api_bible_passage_failed", ref=ref, error=str(exc))
    return docs


async def collect_reddit() -> list[RawDocument]:
    settings = get_settings()
    if not settings.reddit_enabled:
        return []
    subs = ["worldnews", "Christianity", "TrueChristian"]
    docs: list[RawDocument] = []
    headers = {"User-Agent": settings.reddit_user_agent}
    async with httpx.AsyncClient(timeout=20.0, headers=headers) as client:
        for sub in subs:
            try:
                url = f"https://www.reddit.com/r/{sub}/hot.json?limit=5"
                res = await client.get(url)
                if res.status_code != 200:
                    continue
                for child in res.json().get("data", {}).get("children", []):
                    post = child.get("data", {})
                    docs.append(
                        RawDocument(
                            titulo=post.get("title", "Reddit"),
                            conteudo=(post.get("title", "") + " " + post.get("selftext", ""))[
                                :2000
                            ],
                            fonte=f"reddit:{sub}",
                            url=f"https://reddit.com{post.get('permalink', '')}",
                            categoria="micro_comportamento",
                        )
                    )
            except Exception as exc:
                logger.warning("reddit_failed", sub=sub, error=str(exc))
    return docs


async def collect_google_trends() -> list[RawDocument]:
    settings = get_settings()
    if not settings.google_trends_enabled:
        return []
    try:
        from pytrends.request import TrendReq
    except ImportError:
        return []
    keywords = ["apostasy", "digital currency", "middle east war", "spiritual awakening"]
    docs: list[RawDocument] = []
    try:
        pytrends = TrendReq(hl="pt-BR", tz=180)
        pytrends.build_payload(keywords[:5], timeframe="now 7-d")
        df = pytrends.interest_over_time()
        if df is not None and not df.empty:
            summary = df.tail(3).to_string()
            docs.append(
                RawDocument(
                    titulo="Google Trends — sinais micro",
                    conteudo=summary,
                    fonte="google_trends",
                    url="https://trends.google.com",
                    categoria="micro_comportamento",
                )
            )
    except Exception as exc:
        logger.warning("google_trends_failed", error=str(exc))
    return docs


async def collect_wef_cbdc() -> list[RawDocument]:
    """Monitoramento macro tech via RSS WEF + feeds CBDC configuráveis."""
    feeds = [
        {
            "name": "wef_agenda",
            "url": "https://www.weforum.org/agenda/rss",
            "categoria": "macro_tecnologia",
        },
        {
            "name": "bis_cbdc",
            "url": "https://www.bis.org/forum/research/rss.xml",
            "categoria": "macro_cbdc",
        },
    ]
    import feedparser

    docs: list[RawDocument] = []
    for feed in feeds:
        try:
            parsed = feedparser.parse(feed["url"])
            for entry in parsed.entries[:5]:
                docs.append(
                    RawDocument(
                        titulo=entry.get("title", feed["name"]),
                        conteudo=entry.get("summary", entry.get("title", "")),
                        fonte=f"rss:{feed['name']}",
                        url=entry.get("link", ""),
                        categoria=feed["categoria"],
                    )
                )
        except Exception as exc:
            logger.warning("wef_cbdc_feed_failed", feed=feed["name"], error=str(exc))
    return docs
