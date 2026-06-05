"use client";



import { useEffect, useState } from "react";

import { RankingTable } from "@/components/dashboard/RankingTable";

import { FalseLeaderAlert } from "@/components/dashboard/FalseLeaderAlert";

import { Header } from "@/components/ui/Header";

import { LoadingDots } from "@/components/ui/LoadingDots";

import { PageShell } from "@/components/ui/PageShell";

import { fetchRanking, fetchRankingSWR, fetchResultadoAtualSWR } from "@/lib/api";

import type { Correlacao, RankingCandidato } from "@/lib/types";



export default function RankingsPage() {

  const [dataRef, setDataRef] = useState<string | undefined>();

  const [rankingMar, setRankingMar] = useState<RankingCandidato[]>([]);

  const [rankingTerra, setRankingTerra] = useState<RankingCandidato[]>([]);

  const [rankingFalsoLider, setRankingFalsoLider] = useState<RankingCandidato[]>([]);

  const [corr, setCorr] = useState<Correlacao>({});

  const [loading, setLoading] = useState(true);

  const [isMock, setIsMock] = useState(false);



  useEffect(() => {

    Promise.all([

      fetchResultadoAtualSWR(),

      fetchRankingSWR("besta_mar"),

      fetchRankingSWR("besta_terra"),

      fetchRankingSWR("falso_lider"),

    ]).then(([atual, mar, terra, falsoLider]) => {

      setDataRef(atual.data.data_referencia);

      setRankingMar(mar.data);

      setRankingTerra(terra.data);

      setRankingFalsoLider(falsoLider.data);

      setCorr(atual.data.correlacao ?? {});

      setIsMock(mar.isMock || terra.isMock || atual.isMock || falsoLider.isMock);

      setLoading(false);



      if (mar.revalidating) {

        fetchRanking("besta_mar", { skipCache: true }).then((fresh) => setRankingMar(fresh.data));

      }

      if (terra.revalidating) {

        fetchRanking("besta_terra", { skipCache: true }).then((fresh) =>

          setRankingTerra(fresh.data),

        );

      }

      if (falsoLider.revalidating) {

        fetchRanking("falso_lider", { skipCache: true }).then((fresh) =>

          setRankingFalsoLider(fresh.data),

        );

      }

    });

  }, []);



  return (

    <>

      <Header dataReferencia={dataRef} isMock={isMock} />

      <PageShell

        badge="MCDA + Bayes"

        title="Rankings Probabilísticos"

        subtitle="Top-10 por personagem — Probabilidade de Alinhamento de Perfil (PAP) atualizada pelo motor diário."

      >

        <div className="mb-1 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500" role="list" aria-label="Categorias de personagens ranqueados">
          <span className="rounded-full border border-ink-700/70 bg-ink-950/50 px-3 py-1">Mar</span>
          <span className="rounded-full border border-ink-700/70 bg-ink-950/50 px-3 py-1">Terra</span>
          <span className="rounded-full border border-gold-400/20 bg-amber-950/40 px-3 py-1 text-gold-200">Falso líder</span>
        </div>

        {loading ? (

          <LoadingDots label="Carregando rankings" />

        ) : (

          <div className="grid grid-cols-1 gap-6 stagger-grid">

            <FalseLeaderAlert

              alerta={corr.alerta_falso_lider ?? false}

              scoreIncongruencia={corr.score_incongruencia ?? 0}

              justificativa={corr.justificativa}

            />

            <RankingTable

              title="Besta que Sobe do Mar"

              subtitle="Anticristo — unificação geopolítica, carisma, engano e centralização"

              items={rankingMar}

            />

            <RankingTable

              title="Besta que Sobe da Terra"

              subtitle="Falso Profeta — validação do líder, monopólio narrativo, prodígios tecnológicos"

              items={rankingTerra}

            />

            <RankingTable

              title="Falso Líder / Anticristo"

              subtitle="Incongruência discurso vs. controle — padrão de engano sistêmico e centralização velada"

              items={rankingFalsoLider}

            />

          </div>

        )}

      </PageShell>

    </>

  );

}

