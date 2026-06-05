from __future__ import annotations

from datetime import date
from typing import Any

import structlog

from motor.adapters.email_sender import EmailSender
from motor.adapters.supabase import SupabaseClient, get_supabase
from motor.config import get_settings

logger = structlog.get_logger()


def build_unsubscribe_url(token: str, site_url: str) -> str:
    return f"{site_url.rstrip('/')}/inscricao/cancelar?token={token}"


def build_email_footer_unsubscribe(token: str, site_url: str) -> str:
    url = build_unsubscribe_url(token, site_url)
    return f"Para deixar de receber estes avisos, cancele sua inscrição: {url}"


class NewsletterDigestService:
    """Lê inscritos do DB compartilhado e envia digest diário ao final do pipeline."""

    def __init__(self, db: SupabaseClient | None = None) -> None:
        self.db = db or get_supabase()
        self.settings = get_settings()
        self.sender = EmailSender(self.settings)
        self.site_url = (self.settings.site_url or "http://localhost:3000").rstrip("/")

    def list_active(self, limit: int = 5000) -> list[dict]:
        return self.db.select(
            "newsletter_subscribers",
            filters={"status": "active"},
            order="-subscribed_at",
            limit=limit,
        )

    def send_daily_digest(self, ref_date: date, payload: dict[str, Any]) -> dict[str, Any]:
        subscribers = self.list_active()
        if not subscribers:
            logger.info("daily_newsletter_skipped", reason="no_subscribers")
            return {"sent": 0, "failed": 0, "dry_run": self.sender.should_dry_run(), "skipped": True}

        fase = payload.get("fase_atual", "—")
        indice = payload.get("indice_global", 0)
        confianca = payload.get("confianca", 0)
        subject = f"Atualização diária — {fase} · {ref_date.isoformat()}"

        sent = 0
        failed = 0
        dry_run = self.sender.should_dry_run()

        for row in subscribers:
            email = row.get("email")
            token = row.get("unsubscribe_token", "")
            if not email:
                failed += 1
                continue

            footer = build_email_footer_unsubscribe(token, self.site_url)
            text_body = self._build_digest_text(ref_date, fase, indice, confianca, footer)
            html_body = self._build_digest_html(ref_date, fase, indice, confianca, footer)

            if self.sender.send(email, subject, text_body, html_body):
                sent += 1
            else:
                failed += 1

        result = {"sent": sent, "failed": failed, "dry_run": dry_run, "total": len(subscribers)}
        logger.info("daily_newsletter_complete", **result)
        return result

    def _build_digest_text(
        self,
        ref_date: date,
        fase: str,
        indice: float,
        confianca: float,
        footer: str,
    ) -> str:
        return (
            f"Monitor Escatológico — atualização de {ref_date.isoformat()}\n\n"
            f"Fase atual: {fase}\n"
            f"Índice global: {indice:.2%}\n"
            f"Confiança: {confianca:.2%}\n\n"
            f"Acesse o painel: {self.site_url}/\n\n"
            f"—\n{footer}"
        )

    def _build_digest_html(
        self,
        ref_date: date,
        fase: str,
        indice: float,
        confianca: float,
        footer: str,
    ) -> str:
        return (
            f"<p>Monitor Escatológico — atualização de <strong>{ref_date.isoformat()}</strong></p>"
            f"<ul>"
            f"<li>Fase atual: <strong>{fase}</strong></li>"
            f"<li>Índice global: <strong>{indice:.2%}</strong></li>"
            f"<li>Confiança: <strong>{confianca:.2%}</strong></li>"
            f"</ul>"
            f'<p><a href="{self.site_url}/">Abrir painel</a></p>'
            f"<hr><p style=\"font-size:12px;color:#666\">{footer}</p>"
        )
