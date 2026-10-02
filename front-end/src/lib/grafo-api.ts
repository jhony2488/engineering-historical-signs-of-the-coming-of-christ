import type { CenarioSimulacao } from "./types";

export type GrafoPayload = {
  nodes: { id: string; label: string; tipo: string; peso_gnn?: number }[];
  edges: { source: string; target: string; relacao: string }[];
  gnn_convergence?: number;
};

export async function fetchGrafo(): Promise<GrafoPayload> {
  const res = await fetch("/api/db/grafo", { credentials: "include" });
  if (!res.ok) throw new Error(`grafo ${res.status}`);
  return res.json() as Promise<GrafoPayload>;
}

export async function fetchCenarios(): Promise<CenarioSimulacao[]> {
  const res = await fetch("/api/db/cenarios", { credentials: "include" });
  if (!res.ok) throw new Error(`cenarios ${res.status}`);
  return res.json() as Promise<CenarioSimulacao[]>;
}

export async function fetchWhatIf(ativos: string[]) {
  const res = await fetch("/api/db/cenarios/what-if", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ativos, trials: 200 }),
  });
  if (!res.ok) throw new Error(`what-if ${res.status}`);
  return res.json() as Promise<import("./scenario-whatif").WhatIfResult>;
}
