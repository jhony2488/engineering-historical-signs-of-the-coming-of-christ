from datetime import date

from motor.pipeline.newsletter_service import (
    NewsletterDigestService,
    build_email_footer_unsubscribe,
    build_unsubscribe_url,
)


class FakeNewsletterDb:
    def __init__(self) -> None:
        self.rows: list[dict] = []

    def select(
        self,
        table: str,
        columns: str = "*",
        filters: dict | None = None,
        order: str | None = None,
        limit: int | None = None,
    ) -> list[dict]:
        rows = [r for r in self.rows if all(r.get(k) == v for k, v in (filters or {}).items())]
        if order and order.startswith("-") and rows:
            key = order.lstrip("-")
            rows = sorted(rows, key=lambda r: r.get(key, ""), reverse=True)
        if limit:
            rows = rows[:limit]
        return rows


def test_list_active_filters_subscribers():
    db = FakeNewsletterDb()
    db.rows = [
        {"email": "a@x.com", "status": "active", "subscribed_at": "2026-06-01"},
        {"email": "b@x.com", "status": "unsubscribed", "subscribed_at": "2026-06-02"},
    ]
    svc = NewsletterDigestService(db=db)  # type: ignore[arg-type]

    active = svc.list_active()
    assert len(active) == 1
    assert active[0]["email"] == "a@x.com"


def test_send_daily_digest_dry_run_counts_subscribers():
    db = FakeNewsletterDb()
    db.rows = [
        {
            "email": "a@x.com",
            "status": "active",
            "unsubscribe_token": "a" * 64,
            "subscribed_at": "2026-06-01",
        },
        {
            "email": "b@x.com",
            "status": "active",
            "unsubscribe_token": "b" * 64,
            "subscribed_at": "2026-06-02",
        },
    ]
    svc = NewsletterDigestService(db=db)  # type: ignore[arg-type]

    result = svc.send_daily_digest(
        date(2026, 6, 5),
        {"fase_atual": "FASE_II", "indice_global": 0.42, "confianca": 0.71},
    )

    assert result["sent"] == 2
    assert result["failed"] == 0
    assert result["dry_run"] is True
    assert result["total"] == 2


def test_send_daily_digest_skips_when_no_subscribers():
    db = FakeNewsletterDb()
    svc = NewsletterDigestService(db=db)  # type: ignore[arg-type]

    result = svc.send_daily_digest(date(2026, 6, 5), {"fase_atual": "FASE_I"})

    assert result["sent"] == 0
    assert result["skipped"] is True


def test_build_unsubscribe_helpers():
    url = build_unsubscribe_url("abc123", "https://example.com/")
    assert url == "https://example.com/inscricao/cancelar?token=abc123"
    footer = build_email_footer_unsubscribe("abc123", "https://example.com")
    assert "cancele sua inscrição" in footer
    assert "abc123" in footer
