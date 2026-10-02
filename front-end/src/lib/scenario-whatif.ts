import type { CenarioSimulacao, FaseId } from "@/lib/types";

export type WhatIfResult = {
  ativos: string[];
  cenarios_desbloqueados: { id: string; titulo: string; impacto_indice: number }[];
  indice_projetado: number;
  monte_carlo: {
    trials: number;
    p10: number;
    p50: number;
    p90: number;
    mean: number;
  };
  fase_sugerida: FaseId;
};

function faseFromIndice(indice: number): FaseId {
  if (indice >= 0.8) return "FASE_IV";
  if (indice >= 0.65) return "FASE_III";
  if (indice >= 0.45) return "FASE_II";
  return "FASE_I";
}

/** Mulberry32 — PRNG determinístico para Monte Carlo estável. */
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function runWhatIfSimulation(
  cenarios: CenarioSimulacao[],
  opts: { ativos: string[]; baseIndice?: number; trials?: number; noise?: number },
): WhatIfResult {
  const ativos = new Set(opts.ativos);
  const baseIndice = opts.baseIndice ?? 0.58;
  const trials = Math.min(2000, Math.max(10, opts.trials ?? 200));
  const noise = opts.noise ?? 0.04;

  const unlocked = cenarios.filter(
    (c) =>
      c.precondicoes.every((p) => ativos.has(p)) &&
      c.dependencias.every((d) => ativos.has(d)),
  );
  const impacto = unlocked.reduce((s, c) => s + c.impacto_indice, 0);
  const indiceProjetado = Math.min(0.95, baseIndice + impacto);

  const rand = mulberry32(42 + ativos.size);
  const samples: number[] = [];
  for (let i = 0; i < trials; i++) {
    let jitter = 0;
    for (const c of unlocked) {
      jitter += c.impacto_indice * (1 + (rand() * 2 - 1) * noise);
    }
    let bonus = 0;
    for (const c of cenarios) {
      if (unlocked.some((u) => u.id === c.id)) continue;
      const pre = c.precondicoes;
      if (pre.length && pre.filter((p) => ativos.has(p)).length / pre.length >= 0.5) {
        if (rand() < 0.25) bonus += c.impacto_indice * 0.5;
      }
    }
    samples.push(Math.min(0.98, baseIndice + jitter + bonus));
  }
  samples.sort((a, b) => a - b);
  const n = samples.length;
  const p50 = samples[Math.floor(n / 2)] ?? indiceProjetado;
  const p10 = samples[Math.floor(n / 10)] ?? p50;
  const p90 = samples[Math.min(n - 1, Math.floor(n * 0.9))] ?? p50;
  const mean = samples.reduce((a, b) => a + b, 0) / n;

  return {
    ativos: [...ativos].sort(),
    cenarios_desbloqueados: unlocked.map((c) => ({
      id: c.id,
      titulo: c.titulo,
      impacto_indice: c.impacto_indice,
    })),
    indice_projetado: Number(indiceProjetado.toFixed(4)),
    monte_carlo: {
      trials: n,
      p10: Number(p10.toFixed(4)),
      p50: Number(p50.toFixed(4)),
      p90: Number(p90.toFixed(4)),
      mean: Number(mean.toFixed(4)),
    },
    fase_sugerida: faseFromIndice(p50),
  };
}
