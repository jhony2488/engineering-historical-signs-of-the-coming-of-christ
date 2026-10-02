import { describe, expect, it } from "vitest";

import { runWhatIfSimulation } from "../scenario-whatif";
import type { CenarioSimulacao } from "../types";

const CENARIOS: CenarioSimulacao[] = [
  {
    id: "evt_cbdc",
    titulo: "CBDC",
    descricao: "teste",
    precondicoes: ["evt_oriente"],
    dependencias: [],
    fase_alvo: "FASE_III",
    impacto_indice: 0.12,
  },
  {
    id: "prof_ap",
    titulo: "Ap",
    descricao: "teste",
    precondicoes: ["evt_cbdc"],
    dependencias: ["evt_cbdc"],
    fase_alvo: "FASE_III",
    impacto_indice: 0.15,
  },
];

describe("runWhatIfSimulation", () => {
  it("returns deterministic monte carlo bands", () => {
    const a = runWhatIfSimulation(CENARIOS, { ativos: ["evt_oriente"], trials: 100 });
    const b = runWhatIfSimulation(CENARIOS, { ativos: ["evt_oriente"], trials: 100 });
    expect(a.monte_carlo.p50).toBe(b.monte_carlo.p50);
    expect(a.cenarios_desbloqueados.some((c) => c.id === "evt_cbdc")).toBe(true);
    expect(a.monte_carlo.p10).toBeLessThanOrEqual(a.monte_carlo.p90);
  });
});
