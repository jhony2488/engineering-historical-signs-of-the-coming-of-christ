"use client";

import { useCallback, useEffect, useState } from "react";

import { Header } from "@/components/ui/Header";
import { LoadingDots } from "@/components/ui/LoadingDots";
import { PageShell } from "@/components/ui/PageShell";

type PendingReview = {
  id: string;
  data_referencia: string;
  fase_atual: string;
  indice_global: number;
  confianca: number;
  status?: string;
  transicao_fase?: { transicao_entre_fases?: boolean; descricao?: string };
};

type AuditEntry = {
  id: string;
  data_referencia: string;
  status: string;
  fase_atual: string;
  revisao_aprovada_em?: string;
  revisao_rejeitada_em?: string;
  revisao_motivo?: string;
};

export default function RevisaoPage() {
  const [items, setItems] = useState<PendingReview[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pendingRes, auditRes] = await Promise.all([
        fetch("/api/admin/revisao/pending", { credentials: "include" }),
        fetch("/api/admin/revisao/audit", { credentials: "include" }),
      ]);
      if (!pendingRes.ok) throw new Error(`HTTP ${pendingRes.status}`);
      setItems((await pendingRes.json()) as PendingReview[]);
      if (auditRes.ok) {
        setAudit((await auditRes.json()) as AuditEntry[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(dataReferencia: string, action: "approve" | "reject") {
    setBusy(`${action}:${dataReferencia}`);
    try {
      const res = await fetch(`/api/admin/revisao/${action}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data_referencia: dataReferencia }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Falha ao ${action}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <Header variant="admin" />
      <PageShell
        badge="Humano no loop"
        title="Revisão Humana"
        subtitle="Aprove ou rejeite transições de fase antes da publicação no painel público (quando AUTO_APPROVE_CRITERIA=false no motor)."
      >
        {loading && (
          <div className="flex items-center gap-2 text-slate-400">
            <LoadingDots />
            Carregando pendências…
          </div>
        )}
        {error && (
          <p className="text-rose-300 text-sm" role="alert" aria-live="assertive">
            {error}
          </p>
        )}
        {!loading && items.length === 0 && (
          <p className="text-slate-400 text-sm" role="status">
            Nenhuma revisão pendente.
          </p>
        )}
        <ul className="space-y-4 stagger-children" aria-label="Resultados aguardando revisão humana">
          {items.map((item) => (
            <li key={item.id} className="card-interactive p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-white font-medium">{item.data_referencia}</p>
                  <p className="text-sm text-slate-400 mt-1">
                    {item.fase_atual} · índice {item.indice_global.toFixed(3)} · confiança{" "}
                    {item.confianca.toFixed(3)}
                  </p>
                  {item.transicao_fase?.transicao_entre_fases && (
                    <p className="text-xs text-amber-300 mt-2">
                      Transição detectada: {item.transicao_fase.descricao || "—"}
                    </p>
                  )}
                  <p className="text-xs text-slate-600 mt-1">status: {item.status ?? "—"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => decide(item.data_referencia, "approve")}
                    aria-busy={busy === `approve:${item.data_referencia}`}
                    aria-label={`Aprovar publicação do resultado de ${item.data_referencia}`}
                    className="btn-primary text-sm"
                  >
                    {busy === `approve:${item.data_referencia}` ? "Aprovando…" : "Aprovar"}
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => decide(item.data_referencia, "reject")}
                    aria-busy={busy === `reject:${item.data_referencia}`}
                    aria-label={`Rejeitar transição do resultado de ${item.data_referencia}`}
                    className="rounded-lg border border-rose-700/60 px-3 py-2 text-sm text-rose-300 hover:bg-rose-950/40"
                  >
                    {busy === `reject:${item.data_referencia}` ? "Rejeitando…" : "Rejeitar"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {audit.length > 0 && (
          <section className="mt-10" aria-labelledby="audit-title">
            <h2 id="audit-title" className="font-display text-lg text-white mb-3">
              Auditoria recente
            </h2>
            <ul className="space-y-2 text-sm text-slate-400">
              {audit.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap justify-between gap-2 border-b border-ink-800 pb-2"
                >
                  <span>
                    {entry.data_referencia} · {entry.fase_atual} ·{" "}
                    <span
                      className={
                        entry.status === "rejected"
                          ? "text-rose-300"
                          : entry.status === "complete"
                            ? "text-emerald-300"
                            : "text-amber-300"
                      }
                    >
                      {entry.status}
                    </span>
                  </span>
                  <span className="text-xs text-slate-600">
                    {entry.revisao_aprovada_em || entry.revisao_rejeitada_em || "—"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </PageShell>
    </div>
  );
}
