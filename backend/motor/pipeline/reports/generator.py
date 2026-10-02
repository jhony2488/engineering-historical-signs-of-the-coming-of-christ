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
.alert{background:#e8eef5;border-left:4px solid #456}
.note{color:#444;font-size:0.95rem;margin:1rem 0}
h2{margin-top:1.5rem} table{width:100%;border-collapse:collapse;font-size:0.9rem}
td,th{border:1px solid #ddd;padding:0.4rem;text-align:left}</style></head>
<body>
<h1>Engenharia de Sinais — {{ data }}</h1>
<p class="note">Leitura probabilística (report_editor.txt). Não constitui previsão datada
nem juízo ideológico. Confiança {{ confianca|round(4) }}.</p>
<div class="metric"><strong>Fase:</strong> {{ fase }} ({{ prob|round(1) }}%)</div>
<div class="metric"><strong>Índice Global:</strong> {{ indice|round(4) }}</div>
<div class="metric"><strong>Proximidade espiritual:</strong> {{ proximidade|round(4) }}</div>
<div class="metric"><strong>Confiança:</strong> {{ confianca|round(4) }}</div>
{% if alerta %}<div class="metric alert"><strong>Alerta de incongruência discurso x estrutura</strong></div>{% endif %}
{% if merkle %}<div class="metric"><strong>Integridade L14 (Merkle):</strong> {{ merkle[:16] }}…</div>{% endif %}

<h2>Eventos ({{ eventos|length }})</h2>
<ul>{% for e in eventos %}<li>{{ e.evento }} — {{ e.regiao }} ({{ e.energia }})</li>{% endfor %}</ul>

<h2>Ranking Besta do Mar</h2>
<ol>{% for r in ranking_mar %}<li>{{ r.nome }} — {{ r.probabilidade_atual }}%</li>{% endfor %}</ol>
<h2>Ranking Besta da Terra</h2>
<ol>{% for r in ranking_terra %}<li>{{ r.nome }} — {{ r.probabilidade_atual }}%</li>{% endfor %}</ol>

{% if ameacas %}
<h2>Ameaças por país (L10) — Top 5</h2>
<table>
<tr><th>País</th><th>Risco</th><th>Eco (L11)</th></tr>
{% for a in ameacas %}
<tr>
  <td>{{ a.country_name }} ({{ a.country_code }})</td>
  <td>{{ (a.risk_score * 100)|round(0) }}%</td>
  <td>{{ (a.historical_echo or {}).get('titulo', '—') }}</td>
</tr>
{% endfor %}
</table>
{% endif %}

{% if ecos %}
<h2>Ecos históricos (L11)</h2>
<ul>{% for e in ecos %}<li>{{ e.titulo or e.historical_echo_match }} — {{ e.similarity_percentage }}%</li>{% endfor %}</ul>
{% endif %}

{% if abm %}
<h2>Simulação ABM (L12)</h2>
<ul>{% for s in abm %}
<li>{{ s.country_code }}: fragilidade {{ s.fragility_index }} —
{{ (s.synthesis or {}).get('synthesis', '')[:160] }}</li>
{% endfor %}</ul>
{% endif %}

{% if adversarial %}
<h2>Red team (L13)</h2>
<ul>{% for a in adversarial %}
<li>{{ a.country_code }}: resiliência {{ a.resilience_score }} —
{{ a.recommendation or a.counter_thesis or '' }}</li>
{% endfor %}</ul>
{% endif %}

{% if recs %}
<h2>Recomendações adaptativas (L15)</h2>
<ul>{% for r in recs %}
<li>{{ r.country_code }} [{{ r.urgency }}]: {{ (r.actions or [''])[0] }}</li>
{% endfor %}</ul>
{% endif %}
</body></html>
"""


class ReportGenerator:
    def generate_html(self, payload: dict[str, Any]) -> str:
        ameacas = sorted(
            payload.get("ameacas_paises") or [],
            key=lambda a: a.get("risk_score", 0),
            reverse=True,
        )[:5]
        abm = (payload.get("simulacoes_abm") or [])[:5]
        adv = payload.get("adversarial") or []
        recs = (payload.get("recomendacoes_adaptativas") or [])[:8]
        prov = payload.get("provenance") or {}
        tpl = Template(TEMPLATE)
        return tpl.render(
            data=payload.get("data_referencia", date.today().isoformat()),
            fase=payload.get("fase_atual", "FASE_I"),
            prob=payload.get("probabilidade_fase", 0) * 100,
            indice=payload.get("indice_global", 0),
            proximidade=payload.get(
                "proximidade_espiritual", payload.get("indice_global", 0)
            ),
            confianca=payload.get("confianca", 0),
            alerta=payload.get("correlacao", {}).get("alerta_falso_lider", False),
            merkle=prov.get("merkle_root"),
            eventos=payload.get("eventos_analisados", []),
            ranking_mar=payload.get("ranking_mar", []),
            ranking_terra=payload.get("ranking_terra", []),
            ameacas=ameacas,
            ecos=(payload.get("ecos_historicos") or [])[:5],
            abm=abm,
            adversarial=adv,
            recs=recs,
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
