"use client";



import { useEffect, useState } from "react";

import { RankingTable } from "@/components/dashboard/RankingTable";

import { Header } from "@/components/ui/Header";

import { LoadingDots } from "@/components/ui/LoadingDots";

import { PageShell } from "@/components/ui/PageShell";

import { fetchRanking, fetchRankingSWR, fetchResultadoAtualSWR } from "@/lib/api";

import type { RankingCandidato } from "@/lib/types";



export default function RankingsPage() {

  const [dataRef, setDataRef] = useState<string | undefined>();

  const [rankingMar, setRankingMar] = useState<RankingCandidato[]>([]);

  const [rankingTerra, setRankingTerra] = useState<RankingCandidato[]>([]);

  const [loading, setLoading] = useState(true);

  const [isMock, setIsMock] = useState(false);



  useEffect(() => {

    Promise.all([

      fetchResultadoAtualSWR(),

      fetchRankingSWR("besta_mar"),

      fetchRankingSWR("besta_terra"),

    ]).then(([atual, mar, terra]) => {

      setDataRef(atual.data.data_referencia);

      setRankingMar(mar.data);

      setRankingTerra(terra.data);

      setIsMock(mar.isMock || terra.isMock || atual.isMock);

      setLoading(false);



      if (mar.revalidating) {

        fetchRanking("besta_mar", { skipCache: true }).then((fresh) => setRankingMar(fresh.data));

      }

      if (terra.revalidating) {

        fetchRanking("besta_terra", { skipCache: true }).then((fresh) =>

          setRankingTerra(fresh.data),

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

        {loading ? (

          <LoadingDots label="Carregando rankings" />

        ) : (

          <div className="grid grid-cols-1 gap-6 stagger-grid">

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

          </div>

        )}

      </PageShell>

      <footer
        data-site-footer
        className="border-t border-ink-800 mt-12 py-6 text-center text-xs text-slate-600"
      >
        Engenharia de Sinais Históricos — análise interpretativa, não predição de datas.
      </footer>

    </>

  );

}

