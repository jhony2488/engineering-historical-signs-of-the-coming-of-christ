from __future__ import annotations

from typing import TYPE_CHECKING

import httpx
import structlog

if TYPE_CHECKING:
    from motor.config import Settings

logger = structlog.get_logger()


class EmailSender:
    """Transactional email via Resend HTTP API. Dry-run when unconfigured."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def is_configured(self) -> bool:
        return bool(self.settings.resend_api_key and self.settings.email_from)

    def should_dry_run(self) -> bool:
        if self.settings.email_dry_run:
            return True
        if self.settings.llm_dry_run:
            return True
        return not self.is_configured()

    def send(
        self,
        to: str,
        subject: str,
        text_body: str,
        html_body: str | None = None,
    ) -> bool:
        if self.should_dry_run():
            logger.info("email_dry_run", to=to, subject=subject)
            return True

        return self._send_resend(to, subject, text_body, html_body)

    def _send_resend(
        self,
        to: str,
        subject: str,
        text_body: str,
        html_body: str | None,
    ) -> bool:
        payload: dict[str, object] = {
            "from": self.settings.email_from,
            "to": [to],
            "subject": subject,
            "text": text_body,
        }
        if html_body:
            payload["html"] = html_body

        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {self.settings.resend_api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
            if response.status_code >= 400:
                logger.warning(
                    "resend_send_failed",
                    to=to,
                    status=response.status_code,
                    body=response.text[:200],
                )
                return False
            return True
        except Exception as exc:
            logger.warning("resend_send_error", to=to, error=str(exc))
            return False
