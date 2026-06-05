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

export default function RevisaoPage() {
  const [items, setItems] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/revisao/pending", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setItems((await res.json()) as PendingReview[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(dataReferencia: string) {
    setApproving(dataReferencia);
    try {
      const res = await fetch("/api/admin/revisao/approve", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data_referencia: dataReferencia }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao aprovar");
    } finally {
      setApproving(null);
    }
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <Header variant="admin" />
      <PageShell
        badge="Humano no loop"
        title="Revisão Humana"
        subtitle="Aprove transições de fase antes da publicação no painel público (quando AUTO_APPROVE_CRITERIA=false no motor)."
      >
        {loading && (
          <div className="flex items-center gap-2 text-slate-400">
            <LoadingDots />
            Carregando pendências…
          </div>
        )}
        {error && <p className="text-rose-300 text-sm">{error}</p>}
        {!loading && items.length === 0 && (
          <p className="text-slate-400 text-sm">Nenhuma revisão pendente.</p>
        )}
        <ul className="space-y-4 stagger-children">
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
                <button
                  type="button"
                  disabled={approving === item.data_referencia}
                  onClick={() => approve(item.data_referencia)}
                  className="btn-primary text-sm"
                >
                  {approving === item.data_referencia ? "Aprovando…" : "Aprovar publicação"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </PageShell>
    </div>
  );
}
