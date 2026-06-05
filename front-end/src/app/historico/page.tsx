"use client";

import { useEffect, useState } from "react";
import { ConvictionChart } from "@/components/charts/ConvictionChart";
import { SynthesisPanel } from "@/components/historico/SynthesisPanel";
import { ChipGroup } from "@/components/ui/ChipGroup";
import { ExportPdfButton } from "@/components/ui/ExportPdfButton";
import { Header } from "@/components/ui/Header";
import { LoadingDots } from "@/components/ui/LoadingDots";
import { PageShell } from "@/components/ui/PageShell";
import {
  fetchHistorico,
  fetchHistoricoSWR,
  fetchSnapshot,
  fetchSnapshotSWR,
} from "@/lib/api";
import { FASES } from "@/lib/phases";
import type { ResultadoEscatologico, JanelaTemporal, SnapshotPeriodo } from "@/lib/types";
import {
  JANELAS_UI,
  WINDOW_DAYS,
  snapshotJanelaHibrida,
  snapshotJanelaNivel2,
} from "@/lib/windows";

function sliceByWindow(data: ResultadoEscatologico[], window: JanelaTemporal) {
  return data.slice(-WINDOW_DAYS[window]);
}

export default function HistoricoPage() {
  const [historico, setHistorico] = useState<ResultadoEscatologico[]>([]);
  const [janela, setJanela] = useState<JanelaTemporal>("monthly");
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<SnapshotPeriodo | null>(null);
  const [hybrid, setHybrid] = useState<SnapshotPeriodo | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);

  useEffect(() => {
    fetchHistoricoSWR(365).then((r) => {
      setHistorico(r.data);
      setLoading(false);
      if (r.revalidating) {
        fetchHistorico(undefined, 365, { skipCache: true }).then((fresh) =>
          setHistorico(fresh.data),
        );
      }
    });
  }, []);

  useEffect(() => {
    const j2 = snapshotJanelaNivel2(janela);
    const j3 = snapshotJanelaHibrida(janela);
    setSnapshotLoading(true);

    Promise.all([
      fetchSnapshotSWR(j2),
      j3
        ? fetchSnapshotSWR(j3)
        : Promise.resolve({
            data: null,
            fromCache: false,
            isMock: false,
            source: "db" as const,
            revalidating: false,
          }),
    ])
      .then(([s2, s3]) => {
        setSnapshot(s2.data);
        setHybrid(s3.data);
        if (s2.revalidating) {
          fetchSnapshot(j2, { skipCache: true }).then((fresh) => setSnapshot(fresh.data));
        }
        if (j3 && s3.revalidating) {
          fetchSnapshot(j3, { skipCache: true }).then((fresh) => setHybrid(fresh.data));
        }
      })
      .finally(() => setSnapshotLoading(false));
  }, [janela]);

  const filtered = sliceByWindow(historico, janela);
  const motorMeta = JANELAS_UI.find((j) => j.id === janela);

  return (
    <>
      <Header variant="admin" />
      <PageShell
        badge="Motor Nível 1–3"
        title="Arquivo Cronológico"
        subtitle="Síntese diária, painéis Nível 2 e panorama híbrido Nível 3 — via API Next.js/Prisma."
        actions={<ExportPdfButton />}
      >
        <ChipGroup
          options={JANELAS_UI.map((j) => ({ id: j.id, label: j.label }))}
          value={janela}
          onChange={setJanela}
        />

        <SynthesisPanel
          snapshot={snapshot}
          hybrid={hybrid}
          loading={snapshotLoading}
          motorLabel={motorMeta?.motor}
        />

        {loading ? (
          <LoadingDots label="Carregando histórico" />
        ) : (
          <div className="space-y-6 stagger-grid">
            <ConvictionChart historico={filtered} />
            <div className="card-interactive overflow-x-auto">
              <h3 className="card-title">Registros — {motorMeta?.label}</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-ink-700">
                    <th className="pb-2 pr-4">Data</th>
                    <th className="pb-2 pr-4">Fase</th>
                    <th className="pb-2 pr-4 text-right">Índice</th>
                    <th className="pb-2 pr-4 text-right">Confiança</th>
                    <th className="pb-2">Transição</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...filtered].reverse().map((h) => (
                    <tr key={h.data_referencia} className="table-row-hover">
                      <td className="py-2 pr-4 text-slate-300">{h.data_referencia}</td>
                      <td className="py-2 pr-4 text-slate-400">
                        {FASES.find((f) => f.id === h.fase_atual)?.titulo ?? h.fase_atual}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums text-gold-400">
                        {(h.indice_global * 100).toFixed(1)}%
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {(h.confianca * 100).toFixed(1)}%
                      </td>
                      <td className="py-2 text-xs">
                        {h.transicao_fase?.transicao_entre_fases ||
                        h.correlacao?.transicao_fase?.transicao_entre_fases ? (
                          <span className="text-violet-400">
                            {(
                              h.transicao_fase ?? h.correlacao?.transicao_fase
                            )?.fase_dominante?.replace("FASE_", "")}
                            ↔
                            {(
                              h.transicao_fase ?? h.correlacao?.transicao_fase
                            )?.fase_secundaria?.replace("FASE_", "")}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-2 text-xs text-slate-500">{h.status ?? "complete"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </PageShell>
    </>
  );
}
