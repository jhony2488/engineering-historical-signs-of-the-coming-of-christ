"use client";

import { useEffect, useState } from "react";

import { fetchCenarios, fetchGrafo, type GrafoPayload } from "@/lib/grafo-api";
import {
  MOCK_CENARIOS,
  MOCK_NOS_GRAFO,
  buildGrafoArestas,
} from "@/lib/mock-cenarios";
import type { CenarioSimulacao } from "@/lib/types";

export function useGrafoData() {
  const [grafo, setGrafo] = useState<GrafoPayload | null>(null);
  const [cenarios, setCenarios] = useState<CenarioSimulacao[]>(MOCK_CENARIOS);
  const [fromDb, setFromDb] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [g, c] = await Promise.all([fetchGrafo(), fetchCenarios()]);
        if (!cancelled) {
          setGrafo(g);
          setCenarios(c);
          setFromDb(true);
        }
      } catch {
        if (!cancelled) {
          setGrafo({
            nodes: MOCK_NOS_GRAFO.map((n) => ({ ...n })),
            edges: buildGrafoArestas().map((e) => ({
              source: e.source,
              target: e.target,
              relacao: e.relacao,
            })),
          });
          setCenarios(MOCK_CENARIOS);
          setFromDb(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const nos = grafo?.nodes ?? MOCK_NOS_GRAFO;
  const arestas =
    grafo?.edges.map((e) => ({
      source: e.source,
      target: e.target,
      relacao: e.relacao as "precondicao" | "dependencia",
    })) ?? buildGrafoArestas();

  return { nos, cenarios, arestas, fromDb, loading, gnnConvergence: grafo?.gnn_convergence };
}
