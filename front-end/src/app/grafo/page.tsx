"use client";

import { useMemo, useState } from "react";

import { CytoscapeGraph } from "@/components/grafo/CytoscapeGraph";
import { Header } from "@/components/ui/Header";
import { LoadingDots } from "@/components/ui/LoadingDots";
import { PageShell } from "@/components/ui/PageShell";
import { useGrafoData } from "@/hooks/useGrafoData";
import { FASES } from "@/lib/phases";

export default function GrafoPage() {
  const { nos, cenarios, arestas, fromDb, loading, gnnConvergence } = useGrafoData();
  const [ativos, setAtivos] = useState<Set<string>>(new Set());

  const cenariosAtivos = useMemo(
    () =>
      cenarios.filter(
        (c) =>
          c.precondicoes.every((p) => ativos.has(p)) &&
          c.dependencias.every((d) => ativos.has(d)),
      ),
    [cenarios, ativos],
  );

  function toggleNo(id: string) {
    setAtivos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <Header variant="admin" />
      <PageShell
        badge={fromDb ? "DB + GNN" : "Demo"}
        title="Grafo Profético"
        subtitle="Visualização interativa de nós macro/micro, dependências e cenários desbloqueados."
      >
        {loading ? (
          <div className="flex items-center gap-2 text-slate-400 py-8">
            <LoadingDots />
            Carregando grafo…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-2 stagger-grid">
              <div className="card-interactive card-glow p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 mb-2">Camada</p>
                <p className="text-sm text-white">Nós macro/micro + cenários</p>
              </div>
              <div className="card-interactive card-glow p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 mb-2">Leitura</p>
                <p className="text-sm text-white">Dependências pontilhadas mostram avanço progressivo</p>
              </div>
              <div className="card-interactive card-glow p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 mb-2">Foco</p>
                <p className="text-sm text-white">Nós ativos brilham em ouro e ganham prioridade visual</p>
              </div>
            </div>
            {gnnConvergence != null && (
              <p className="text-xs text-slate-500 mb-4">
                Convergência GNN: {(gnnConvergence * 100).toFixed(1)}%
              </p>
            )}
            <div className="card-interactive card-glow animate-fade-in-up p-3 sm:p-4" style={{ animationDelay: "60ms" }}>
              <CytoscapeGraph
                nos={nos.map((n) => ({ id: n.id, label: n.label, tipo: n.tipo }))}
                cenarios={cenarios.map((c) => ({ id: c.id, titulo: c.titulo }))}
                arestas={arestas}
                ativos={new Set([...ativos, ...cenariosAtivos.map((c) => c.id)])}
                height={500}
              />
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500" role="list" aria-label="Legenda do grafo">
              <span className="rounded-full border border-ink-700 bg-ink-900 px-3 py-1">Macro</span>
              <span className="rounded-full border border-ink-700 bg-ink-900 px-3 py-1">Micro</span>
              <span className="rounded-full border border-violet-500/30 bg-violet-950/40 px-3 py-1 text-violet-200">Dependência</span>
              <span className="rounded-full border border-gold-500/30 bg-amber-950/40 px-3 py-1 text-gold-200">Ativo</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-grid">
              <div className="card-interactive card-glow">
                <h3 id="grafo-nos-title" className="card-title">Nós ativos</h3>
                <ul className="space-y-1 mt-3" aria-labelledby="grafo-nos-title">
                  {nos.map((no) => (
                    <li key={no.id}>
                      <label className="flex items-center gap-2 text-sm cursor-pointer rounded-lg px-2 py-2 transition-all duration-200 hover:bg-ink-800/60 hover:translate-x-0.5 hover:text-white">
                        <input
                          type="checkbox"
                          checked={ativos.has(no.id)}
                          onChange={() => toggleNo(no.id)}
                          aria-label={`Ativar nó ${no.label}`}
                          className="rounded border-ink-600 accent-signal-phase"
                        />
                        <span
                          className={
                            no.tipo === "macro" || no.tipo === "evento"
                              ? "text-gold-400"
                              : "text-emerald-400"
                          }
                        >
                          {no.label}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card-interactive card-glow">
                <h3 id="grafo-cenarios-title" className="card-title">Cenários desbloqueados</h3>
                {cenariosAtivos.length === 0 ? (
                  <p className="text-sm text-slate-500 mt-3" role="status">Nenhum cenário ativo.</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm" aria-labelledby="grafo-cenarios-title">
                    {cenariosAtivos.map((c) => (
                      <li
                        key={c.id}
                        className="rounded-lg border border-ink-700/80 bg-ink-800/80 px-3 py-2 text-slate-300 transition-all duration-200 hover:border-signal-phase/30 hover:bg-ink-800 hover:translate-x-0.5"
                      >
                        {c.titulo} —{" "}
                        {FASES.find((f) => f.id === c.fase_alvo)?.titulo ?? c.fase_alvo}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </PageShell>
    </>
  );
}
