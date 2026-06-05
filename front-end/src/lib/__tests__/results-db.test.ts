import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst, findMany } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    resultadoEscatologico: { findFirst, findMany },
    rankingProbabilistico: { findFirst, findMany },
  },
}));

import {
  getHistoricoResultados,
  getRankingDb,
  getUltimoResultado,
} from "@/lib/db/resultados";

const baseJson = {
  schema_version: "1.0.0",
  eventos_analisados: [],
  metricas: {},
  correlacao: {},
  ranking_mar: [],
  ranking_terra: [],
};

describe("db/results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getUltimoResultado returns null when no data", async () => {
    findFirst.mockResolvedValue(null);
    expect(await getUltimoResultado()).toBeNull();
  });

  it("getUltimoResultado maps prisma fields", async () => {
    findFirst.mockResolvedValue({
      dataReferencia: new Date("2026-06-04"),
      faseAtual: "FASE_II",
      probabilidadeFase: 0.62,
      indiceGlobal: 0.58,
      confianca: 0.71,
      jsonAnaliseIa: baseJson,
    });

    const result = await getUltimoResultado();
    expect(result?.data_referencia).toBe("2026-06-04");
    expect(result?.fase_atual).toBe("FASE_II");
    expect(result?.indice_global).toBe(0.58);
  });

  it("getRankingDb returns empty when no date", async () => {
    findFirst.mockResolvedValue(null);
    expect(await getRankingDb("besta_mar")).toEqual([]);
  });

  it("getHistoricoResultados maps list", async () => {
    findMany.mockResolvedValue([
      {
        dataReferencia: new Date("2026-06-01"),
        faseAtual: "FASE_I",
        probabilidadeFase: 0.5,
        indiceGlobal: 0.4,
        confianca: 0.6,
        jsonAnaliseIa: baseJson,
      },
    ]);

    const rows = await getHistoricoResultados();
    expect(rows).toHaveLength(1);
    expect(rows[0].fase_atual).toBe("FASE_I");
  });
});
