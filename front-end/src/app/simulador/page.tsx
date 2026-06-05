"use client";



import Link from "next/link";

import { useMemo, useState } from "react";

import { CytoscapeGraph } from "@/components/grafo/CytoscapeGraph";

import { Header } from "@/components/ui/Header";

import { ExportPdfButton } from "@/components/ui/ExportPdfButton";

import { PageShell } from "@/components/ui/PageShell";

import { useGrafoData } from "@/hooks/useGrafoData";

import { LoadingDots } from "@/components/ui/LoadingDots";

import { FASES } from "@/lib/phases";

import type { CenarioSimulacao } from "@/lib/types";



const BASE_INDICE = 0.58;



function precondicoesAtendidas(cenario: CenarioSimulacao, ativos: Set<string>): boolean {

  return cenario.precondicoes.every((p) => ativos.has(p));

}



function dependenciasAtendidas(cenario: CenarioSimulacao, ativos: Set<string>): boolean {

  return cenario.dependencias.every((d) => ativos.has(d));

}



export default function SimuladorPage() {

  const { nos, cenarios, arestas, fromDb, loading } = useGrafoData();

  const [ativos, setAtivos] = useState<Set<string>>(new Set());



  const cenariosDisponiveis = useMemo(

    () =>

      cenarios.filter(

        (c) => precondicoesAtendidas(c, ativos) && dependenciasAtendidas(c, ativos),

      ),

    [cenarios, ativos],

  );



  const impactoTotal = cenariosDisponiveis.reduce((s, c) => s + c.impacto_indice, 0);

  const indiceProjetado = Math.min(0.95, BASE_INDICE + impactoTotal);



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

        badge={fromDb ? "Motor + DB" : "Demo"}

        title="Simulador de Cenários"

        subtitle="Árvore de dependências proféticas a partir do grafo persistido pelo motor Python."

        actions={

          <>

            <ExportPdfButton />

            <Link href="/grafo" className="btn-ghost" aria-label="Abrir página do grafo profético completo">

              Ver grafo completo

            </Link>

          </>

        }

      >

        {loading ? (
          <div className="flex items-center gap-2 text-slate-400 py-8">
            <LoadingDots />
            Carregando cenários…
          </div>
        ) : (
        <>
        <div className="animate-fade-in-up" style={{ animationDelay: "60ms" }}>

          <CytoscapeGraph

            nos={nos.map((n) => ({ id: n.id, label: n.label, tipo: n.tipo }))}

            cenarios={cenarios.map((c) => ({ id: c.id, titulo: c.titulo }))}

            arestas={arestas}

            ativos={new Set([...ativos, ...cenariosDisponiveis.map((c) => c.id)])}

            height={360}

          />

        </div>



        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 stagger-grid">

          <div className="card-interactive lg:col-span-1">

            <h3 className="card-title">Nós do grafo</h3>

            <ul className="space-y-1 mt-3">

              {nos.map((no) => (

                <li key={no.id}>

                  <label className="flex items-center gap-2 text-sm cursor-pointer rounded-lg px-2 py-2 transition-all duration-200 hover:bg-ink-800/60 hover:translate-x-0.5">

                    <input

                      type="checkbox"

                      checked={ativos.has(no.id)}

                      onChange={() => toggleNo(no.id)}

                      aria-label={`Ativar nó ${no.label}`}

                      className="rounded border-ink-600 accent-signal-phase"

                    />

                    <span className={no.tipo === "macro" ? "text-gold-400" : "text-emerald-400"}>

                      {no.label}

                    </span>

                    <span className="text-xs text-slate-600 ml-auto">{no.tipo}</span>

                  </label>

                </li>

              ))}

            </ul>

          </div>



          <div className="card-interactive lg:col-span-2">

            <h3 className="card-title">Cenários desbloqueados</h3>

            {cenariosDisponiveis.length === 0 ? (

              <p className="text-sm text-slate-500 mt-3">

                Ative mais nós ou dependências para desbloquear cenários.

              </p>

            ) : (

              <ul className="mt-3 space-y-3">

                {cenariosDisponiveis.map((c, i) => (

                  <li

                    key={c.id}

                    className="rounded-lg border border-ink-700 bg-ink-800 p-3 text-sm transition-all duration-200 hover:border-violet-500/30 hover:bg-ink-800 hover:-translate-y-0.5 animate-fade-in-up"

                    style={{ animationDelay: `${i * 50}ms` }}

                  >

                    <p className="font-medium text-white">{c.titulo}</p>

                    <p className="text-slate-400 text-xs mt-1">{c.descricao}</p>

                    <p className="text-xs text-violet-400 mt-2">

                      Fase alvo:{" "}

                      {FASES.find((f) => f.id === c.fase_alvo)?.titulo ?? c.fase_alvo} · impacto +

                      {(c.impacto_indice * 100).toFixed(0)} pp

                    </p>

                  </li>

                ))}

              </ul>

            )}



            <dl className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-ink-700 text-sm">

              <div className="metric-tile text-center">

                <dt className="text-slate-500 text-xs">Índice base (hoje)</dt>

                <dd className="text-gold-400 tabular-nums text-lg mt-1">

                  {(BASE_INDICE * 100).toFixed(1)}%

                </dd>

              </div>

              <div className="metric-tile text-center">

                <dt className="text-slate-500 text-xs">Índice projetado</dt>

                <dd className="text-violet-400 tabular-nums text-lg mt-1 transition-colors duration-300">

                  {(indiceProjetado * 100).toFixed(1)}%

                </dd>

              </div>

            </dl>

          </div>

        </div>
        </>
        )}

      </PageShell>

    </>

  );

}

