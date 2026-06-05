"use client";

import { useEffect, useState } from "react";
import { PropheticBaselinePanel } from "@/components/baseline/PropheticBaselinePanel";
import { EmailSignupForm } from "@/components/newsletter/EmailSignupForm";
import { ChipGroup } from "@/components/ui/ChipGroup";
import { Header } from "@/components/ui/Header";
import { LoadingDots } from "@/components/ui/LoadingDots";
import { PageShell } from "@/components/ui/PageShell";
import {
  fetchBaselineArquivo,
  fetchBaselineAtualizacoesSWR,
  fetchBaselineHistoricoSWR,
} from "@/lib/api";
import type { ArquivoProfeticoItem, BaselineAtualizacao, BaselineHistorico } from "@/lib/types";

type FiltroStatus = "todos" | "cumprida" | "parcial" | "pendente";

const FILTROS: { id: FiltroStatus; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "cumprida", label: "Cumpridas" },
  { id: "parcial", label: "Parciais" },
  { id: "pendente", label: "Pendentes" },
];

export default function ProfeciasPage() {
  const [baseline, setBaseline] = useState<BaselineHistorico | null>(null);
  const [arquivo, setArquivo] = useState<ArquivoProfeticoItem[]>([]);
  const [atualizacoes, setAtualizacoes] = useState<BaselineAtualizacao[]>([]);
  const [filtro, setFiltro] = useState<FiltroStatus>("todos");
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchBaselineHistoricoSWR(),
      fetchBaselineArquivo(),
      fetchBaselineAtualizacoesSWR(30),
    ]).then(([hist, arq, upd]) => {
      setBaseline(hist.data);
      setArquivo(arq.data);
      setAtualizacoes(upd.data);
      setIsMock(hist.isMock || arq.isMock);
      setLoading(false);

      if (hist.revalidating || upd.revalidating) {
        Promise.all([
          fetchBaselineHistoricoSWR(),
          fetchBaselineAtualizacoesSWR(30),
        ]).then(([freshHist, freshUpd]) => {
          if (freshHist.data) setBaseline(freshHist.data);
          setAtualizacoes(freshUpd.data);
        });
      }
    });
  }, []);

  useEffect(() => {
    const status = filtro === "todos" ? undefined : filtro;
    fetchBaselineArquivo(status).then((r) => setArquivo(r.data));
  }, [filtro]);

  const lista = filtro === "todos" ? arquivo : arquivo.filter((a) => a.status === filtro);

  return (
    <>
      <Header variant="public" />
      <PageShell
        badge="Camada 0"
        title="Arquivo Profético"
        subtitle="Overview das ~1.817 profecias bíblicas e atualizações detectadas pelo motor após cada run diário."
      >
        {loading ? (
          <LoadingDots label="Carregando baseline histórico" />
        ) : (
          <div className="space-y-6 stagger-grid">
            <PropheticBaselinePanel
              baseline={baseline}
              atualizacoes={atualizacoes}
              arquivo={arquivo}
              isMock={isMock}
            />

            <EmailSignupForm
              source="profecias"
              title="Avise-me sobre novas profecias cumpridas"
              description="Receba um e-mail quando o motor detectar novas atualizações no arquivo profético após o run diário."
            />

            <ChipGroup
              options={FILTROS}
              value={filtro}
              onChange={setFiltro}
              ariaLabel="Filtrar catálogo profético por status"
            />

            <section className="card-interactive overflow-x-auto" aria-labelledby="profecias-catalog-title">
              <h3 id="profecias-catalog-title" className="card-title">
                Catálogo — {FILTROS.find((f) => f.id === filtro)?.label}
              </h3>
              <table className="w-full text-sm mt-4" aria-labelledby="profecias-catalog-title">
                <caption className="sr-only">
                  Catálogo de profecias — filtro {FILTROS.find((f) => f.id === filtro)?.label}
                </caption>
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-ink-700">
                    <th scope="col" className="pb-2 pr-4">Título</th>
                    <th scope="col" className="pb-2 pr-4">Status</th>
                    <th scope="col" className="pb-2 pr-4">Categoria</th>
                    <th scope="col" className="pb-2 pr-4">Fase</th>
                    <th scope="col" className="pb-2">Referências</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((item) => (
                    <tr key={item.id} className="table-row-hover">
                      <td className="py-2 pr-4 text-slate-300">
                        {item.titulo}
                        {item.cumprida_em && (
                          <span className="block text-[10px] text-violet-400/80">
                            detectado {item.cumprida_em}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`text-xs uppercase ${
                            item.status === "cumprida"
                              ? "text-emerald-400"
                              : item.status === "parcial"
                                ? "text-amber-400"
                                : "text-slate-500"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-xs text-slate-500">{item.categoria}</td>
                      <td className="py-2 pr-4 text-xs text-slate-500">
                        {item.fase_escatologica?.replace("FASE_", "") ?? "—"}
                      </td>
                      <td className="py-2 text-xs text-slate-600">
                        {item.referencias.join(" · ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {lista.length === 0 && (
                <p className="text-sm text-slate-500 py-6 text-center" role="status">
                  Nenhum registro neste filtro. Execute o seed do baseline no backend.
                </p>
              )}
            </section>
          </div>
        )}
      </PageShell>
    </>
  );
}
