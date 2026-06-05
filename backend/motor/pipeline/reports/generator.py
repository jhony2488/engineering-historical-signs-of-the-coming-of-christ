from __future__ import annotations

from datetime import date
from typing import Any

from jinja2 import Template

TEMPLATE = """
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Relatório Escatológico — {{ data }}</title>
<style>body{font-family:sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem}
.metric{background:#f4f4f4;padding:1rem;margin:0.5rem 0;border-radius:8px}
.alert{background:#ffe0e0;border-left:4px solid #c00}</style></head>
<body>
<h1>Engenharia de Sinais — {{ data }}</h1>
<div class="metric"><strong>Fase:</strong> {{ fase }} ({{ prob|round(1) }}%)</div>
<div class="metric"><strong>Índice Global:</strong> {{ indice|round(4) }}</div>
<div class="metric"><strong>Confiança:</strong> {{ confianca|round(4) }}</div>
{% if alerta %}<div class="metric alert"><strong>Alerta Falso Líder</strong></div>{% endif %}
<h2>Eventos ({{ eventos|length }})</h2>
<ul>{% for e in eventos %}<li>{{ e.evento }} — {{ e.regiao }} ({{ e.energia }})</li>{% endfor %}</ul>
<h2>Ranking Besta do Mar</h2>
<ol>{% for r in ranking_mar %}<li>{{ r.nome }} — {{ r.probabilidade_atual }}%</li>{% endfor %}</ol>
</body></html>
"""


class ReportGenerator:
    def generate_html(self, payload: dict[str, Any]) -> str:
        tpl = Template(TEMPLATE)
        return tpl.render(
            data=payload.get("data_referencia", date.today().isoformat()),
            fase=payload.get("fase_atual", "FASE_I"),
            prob=payload.get("probabilidade_fase", 0) * 100,
            indice=payload.get("indice_global", 0),
            confianca=payload.get("confianca", 0),
            alerta=payload.get("correlacao", {}).get("alerta_falso_lider", False),
            eventos=payload.get("eventos_analisados", []),
            ranking_mar=payload.get("ranking_mar", []),
        )

    def generate_pdf_bytes(self, payload: dict[str, Any]) -> bytes:
        """PDF server-side via PyMuPDF (extra pdf)."""
        html = self.generate_html(payload)
        try:
            import fitz
        except ImportError as exc:
            raise RuntimeError("Instale o extra pdf: pip install -e '.[pdf]'") from exc

        doc = fitz.open()
        page = doc.new_page(width=595, height=842)
        rect = fitz.Rect(40, 40, 555, 802)
        page.insert_htmlbox(rect, html)
        pdf_bytes = doc.tobytes()
        doc.close()
        return pdf_bytes
