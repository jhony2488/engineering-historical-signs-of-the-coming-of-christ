const CACHE_KEY = "sinais_resultado_cache";
const TIMESTAMP_KEY = "sinais_resultado_timestamp";
const HISTORICO_KEY = "sinais_historico_cache";
const HISTORICO_TS_KEY = "sinais_historico_timestamp";
const SNAPSHOT_PREFIX = "sinais_snapshot_";
const SNAPSHOT_TS_PREFIX = "sinais_snapshot_ts_";
const RANKING_PREFIX = "sinais_ranking_";
const RANKING_TS_PREFIX = "sinais_ranking_ts_";
const SNAPSHOT_HIST_PREFIX = "sinais_snapshot_hist_";
const SNAPSHOT_HIST_TS_PREFIX = "sinais_snapshot_hist_ts_";

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

export function isCacheExpired(timestampKey: string = TIMESTAMP_KEY): boolean {
  if (typeof window === "undefined") return true;
  const saved = localStorage.getItem(timestampKey);
  if (!saved) return true;
  const savedDate = new Date(parseInt(saved, 10));
  return !isSameCalendarDay(savedDate, new Date());
}

export function getCached<T>(cacheKey: string, timestampKey: string = TIMESTAMP_KEY): T | null {
  if (typeof window === "undefined" || isCacheExpired(timestampKey)) return null;
  const raw = localStorage.getItem(cacheKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setCache<T>(
  cacheKey: string,
  data: T,
  timestampKey: string = TIMESTAMP_KEY,
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(cacheKey, JSON.stringify(data));
  localStorage.setItem(timestampKey, Date.now().toString());
}

export function clearCache(
  cacheKey: string = CACHE_KEY,
  timestampKey: string = TIMESTAMP_KEY,
): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(cacheKey);
  localStorage.removeItem(timestampKey);
}

/** Retorna cache mesmo expirado — padrão stale-while-revalidate no cliente. */
export function getStaleCached<T>(cacheKey: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(cacheKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function snapshotCacheKeys(janela: string) {
  return { data: `${SNAPSHOT_PREFIX}${janela}`, ts: `${SNAPSHOT_TS_PREFIX}${janela}` };
}

export function rankingCacheKeys(personagem: string) {
  return { data: `${RANKING_PREFIX}${personagem}`, ts: `${RANKING_TS_PREFIX}${personagem}` };
}

export function snapshotHistoricoCacheKeys(janela: string, limit: number) {
  const key = `${SNAPSHOT_HIST_PREFIX}${janela}_${limit}`;
  return { data: key, ts: `${SNAPSHOT_HIST_TS_PREFIX}${janela}_${limit}` };
}

export const cacheKeys = {
  resultado: { data: CACHE_KEY, ts: TIMESTAMP_KEY },
  historico: { data: HISTORICO_KEY, ts: HISTORICO_TS_KEY },
};
