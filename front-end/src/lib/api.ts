import {
  cacheKeys,
  getCached,
  getStaleCached,
  isCacheExpired,
  rankingCacheKeys,
  setCache,
  snapshotCacheKeys,
  snapshotHistoricoCacheKeys,
} from "./cache";
import { MOCK_RANKING_MAR, MOCK_RANKING_TERRA } from "./mock-rankings";
import { getMockSnapshot } from "./mock-snapshots";
import { MOCK_RESULTADO, generateMockHistorico } from "./mock";
import type { RankingCandidato, ResultadoEscatologico, SnapshotPeriodo } from "./types";

type DataSource = "db" | "fastapi";

export type FetchMeta = {
  fromCache: boolean;
  isMock: boolean;
  source: DataSource;
  revalidating?: boolean;
};

const DATA_SOURCE = (process.env.NEXT_PUBLIC_DATA_SOURCE || "db") as DataSource;
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

function resolveUrl(path: string): string {
  if (DATA_SOURCE === "db") {
    const origin =
      typeof window !== "undefined"
        ? ""
        : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    return `${origin}/api/db${path}`;
  }
  const api =
    typeof window !== "undefined"
      ? "/api/backend"
      : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  return `${api}${path}`;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = resolveUrl(path);
  const res = await fetch(url, { ...init, next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`API ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

const PATHS = {
  atual: DATA_SOURCE === "db" ? "/resultado/atual" : "/api/v1/resultado/atual",
  historico: (params: string) =>
    DATA_SOURCE === "db" ? `/resultado/historico?${params}` : `/api/v1/resultado/historico?${params}`,
  snapshot: (janela: string) =>
    DATA_SOURCE === "db" ? `/snapshot/${janela}` : `/api/v1/snapshot/${janela}`,
  snapshotHistorico: (janela: string, limit: number) =>
    DATA_SOURCE === "db"
      ? `/snapshot/${janela}/historico?limit=${limit}`
      : `/api/v1/snapshot/${janela}/historico?limit=${limit}`,
  ranking: (personagem: string) =>
    DATA_SOURCE === "db" ? `/ranking/${personagem}` : `/api/v1/ranking/${personagem}`,
};

export async function fetchResultadoAtual(
  options: { skipCache?: boolean } = {},
): Promise<FetchMeta & { data: ResultadoEscatologico }> {
  if (!options.skipCache && typeof window !== "undefined") {
    const cached = getCached<ResultadoEscatologico>(
      cacheKeys.resultado.data,
      cacheKeys.resultado.ts,
    );
    if (cached) {
      return { data: cached, fromCache: true, isMock: false, source: DATA_SOURCE };
    }
  }

  if (USE_MOCK) {
    const data = MOCK_RESULTADO;
    if (typeof window !== "undefined") {
      setCache(cacheKeys.resultado.data, data, cacheKeys.resultado.ts);
    }
    return { data, fromCache: false, isMock: true, source: DATA_SOURCE };
  }

  try {
    const data = await fetchJson<ResultadoEscatologico>(PATHS.atual);
    if (typeof window !== "undefined") {
      setCache(cacheKeys.resultado.data, data, cacheKeys.resultado.ts);
    }
    return { data, fromCache: false, isMock: false, source: DATA_SOURCE };
  } catch {
    const data = MOCK_RESULTADO;
    if (typeof window !== "undefined") {
      setCache(cacheKeys.resultado.data, data, cacheKeys.resultado.ts);
    }
    return { data, fromCache: false, isMock: true, source: DATA_SOURCE };
  }
}

/** Stale-while-revalidate: exibe cache imediatamente e atualiza em background. */
export async function fetchResultadoAtualSWR(): Promise<
  FetchMeta & { data: ResultadoEscatologico }
> {
  const stale =
    typeof window !== "undefined"
      ? getStaleCached<ResultadoEscatologico>(cacheKeys.resultado.data)
      : null;

  if (stale) {
    fetchResultadoAtual({ skipCache: true }).catch(() => undefined);
    return {
      data: stale,
      fromCache: true,
      isMock: false,
      source: DATA_SOURCE,
      revalidating: true,
    };
  }

  return fetchResultadoAtual();
}

export async function fetchHistorico(
  desde?: string,
  limit = 90,
  options: { skipCache?: boolean } = {},
): Promise<FetchMeta & { data: ResultadoEscatologico[] }> {
  if (
    !options.skipCache &&
    typeof window !== "undefined" &&
    !isCacheExpired(cacheKeys.historico.ts)
  ) {
    const cached = getCached<ResultadoEscatologico[]>(
      cacheKeys.historico.data,
      cacheKeys.historico.ts,
    );
    if (cached) {
      return { data: cached, fromCache: true, isMock: false, source: DATA_SOURCE };
    }
  }

  if (USE_MOCK) {
    const data = generateMockHistorico(Math.min(limit, 365));
    if (typeof window !== "undefined") {
      setCache(cacheKeys.historico.data, data, cacheKeys.historico.ts);
    }
    return { data, fromCache: false, isMock: true, source: DATA_SOURCE };
  }

  const params = new URLSearchParams({ limit: String(limit) });
  if (desde) params.set("desde", desde);

  try {
    const data = await fetchJson<ResultadoEscatologico[]>(PATHS.historico(params.toString()));
    if (typeof window !== "undefined") {
      setCache(cacheKeys.historico.data, data, cacheKeys.historico.ts);
    }
    return { data, fromCache: false, isMock: false, source: DATA_SOURCE };
  } catch {
    const data = generateMockHistorico(Math.min(limit, 365));
    if (typeof window !== "undefined") {
      setCache(cacheKeys.historico.data, data, cacheKeys.historico.ts);
    }
    return { data, fromCache: false, isMock: true, source: DATA_SOURCE };
  }
}

export async function fetchHistoricoSWR(
  limit = 365,
): Promise<FetchMeta & { data: ResultadoEscatologico[] }> {
  const stale =
    typeof window !== "undefined"
      ? getStaleCached<ResultadoEscatologico[]>(cacheKeys.historico.data)
      : null;

  if (stale) {
    fetchHistorico(undefined, limit, { skipCache: true }).catch(() => undefined);
    return {
      data: stale,
      fromCache: true,
      isMock: false,
      source: DATA_SOURCE,
      revalidating: true,
    };
  }

  return fetchHistorico(undefined, limit);
}

export async function fetchSnapshot(
  janela: string,
  options: { skipCache?: boolean } = {},
): Promise<FetchMeta & { data: SnapshotPeriodo | null }> {
  const keys = snapshotCacheKeys(janela);

  if (!options.skipCache && typeof window !== "undefined") {
    const cached = getCached<SnapshotPeriodo>(keys.data, keys.ts);
    if (cached) {
      return { data: cached, fromCache: true, isMock: false, source: DATA_SOURCE };
    }
  }

  if (USE_MOCK) {
    const data = getMockSnapshot(janela);
    if (data && typeof window !== "undefined") {
      setCache(keys.data, data, keys.ts);
    }
    return { data, fromCache: false, isMock: true, source: DATA_SOURCE };
  }

  try {
    const data = await fetchJson<SnapshotPeriodo>(PATHS.snapshot(janela));
    if (typeof window !== "undefined") {
      setCache(keys.data, data, keys.ts);
    }
    return { data, fromCache: false, isMock: false, source: DATA_SOURCE };
  } catch {
    const data = getMockSnapshot(janela);
    if (data && typeof window !== "undefined") {
      setCache(keys.data, data, keys.ts);
    }
    return { data, fromCache: false, isMock: true, source: DATA_SOURCE };
  }
}

export async function fetchSnapshotSWR(
  janela: string,
): Promise<FetchMeta & { data: SnapshotPeriodo | null }> {
  const keys = snapshotCacheKeys(janela);
  const stale =
    typeof window !== "undefined" ? getStaleCached<SnapshotPeriodo>(keys.data) : null;

  if (stale) {
    fetchSnapshot(janela, { skipCache: true }).catch(() => undefined);
    return {
      data: stale,
      fromCache: true,
      isMock: false,
      source: DATA_SOURCE,
      revalidating: true,
    };
  }

  return fetchSnapshot(janela);
}

export async function fetchSnapshotHistorico(
  janela: string,
  limit = 12,
  options: { skipCache?: boolean } = {},
): Promise<FetchMeta & { data: SnapshotPeriodo[] }> {
  const keys = snapshotHistoricoCacheKeys(janela, limit);

  if (!options.skipCache && typeof window !== "undefined") {
    const cached = getCached<SnapshotPeriodo[]>(keys.data, keys.ts);
    if (cached) {
      return { data: cached, fromCache: true, isMock: false, source: DATA_SOURCE };
    }
  }

  const mockSingle = getMockSnapshot(janela);

  if (USE_MOCK) {
    const data = mockSingle ? [mockSingle] : [];
    if (typeof window !== "undefined") {
      setCache(keys.data, data, keys.ts);
    }
    return { data, fromCache: false, isMock: true, source: DATA_SOURCE };
  }

  try {
    const data = await fetchJson<SnapshotPeriodo[]>(PATHS.snapshotHistorico(janela, limit));
    if (typeof window !== "undefined") {
      setCache(keys.data, data, keys.ts);
    }
    return { data, fromCache: false, isMock: false, source: DATA_SOURCE };
  } catch {
    const data = mockSingle ? [mockSingle] : [];
    if (typeof window !== "undefined") {
      setCache(keys.data, data, keys.ts);
    }
    return { data, fromCache: false, isMock: true, source: DATA_SOURCE };
  }
}

export async function fetchRanking(
  personagem: "besta_mar" | "besta_terra",
  options: { skipCache?: boolean } = {},
): Promise<FetchMeta & { data: RankingCandidato[] }> {
  const keys = rankingCacheKeys(personagem);

  if (!options.skipCache && typeof window !== "undefined") {
    const cached = getCached<RankingCandidato[]>(keys.data, keys.ts);
    if (cached) {
      return { data: cached, fromCache: true, isMock: false, source: DATA_SOURCE };
    }
  }

  const mockFallback =
    personagem === "besta_mar" ? MOCK_RANKING_MAR : MOCK_RANKING_TERRA;

  if (USE_MOCK) {
    if (typeof window !== "undefined") {
      setCache(keys.data, mockFallback, keys.ts);
    }
    return { data: mockFallback, fromCache: false, isMock: true, source: DATA_SOURCE };
  }

  try {
    const data = await fetchJson<RankingCandidato[]>(PATHS.ranking(personagem));
    if (typeof window !== "undefined") {
      setCache(keys.data, data, keys.ts);
    }
    return { data, fromCache: false, isMock: false, source: DATA_SOURCE };
  } catch {
    if (typeof window !== "undefined") {
      setCache(keys.data, mockFallback, keys.ts);
    }
    return { data: mockFallback, fromCache: false, isMock: true, source: DATA_SOURCE };
  }
}

export async function fetchRankingSWR(
  personagem: "besta_mar" | "besta_terra",
): Promise<FetchMeta & { data: RankingCandidato[] }> {
  const keys = rankingCacheKeys(personagem);
  const stale =
    typeof window !== "undefined" ? getStaleCached<RankingCandidato[]>(keys.data) : null;

  if (stale) {
    fetchRanking(personagem, { skipCache: true }).catch(() => undefined);
    return {
      data: stale,
      fromCache: true,
      isMock: false,
      source: DATA_SOURCE,
      revalidating: true,
    };
  }

  return fetchRanking(personagem);
}

export function isCacheStale(): boolean {
  return isCacheExpired(cacheKeys.resultado.ts);
}

export function getDataSource(): DataSource {
  return DATA_SOURCE;
}
