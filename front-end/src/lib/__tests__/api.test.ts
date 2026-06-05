import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_RESULTADO } from "@/lib/mock";
import { cacheKeys } from "@/lib/cache";
describe("api", () => {
  beforeEach(() => { vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "true"); vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "db"); vi.resetModules(); });
  afterEach(() => { vi.restoreAllMocks(); });
  it("fetchResultadoAtual returns mock", async () => {
    const { fetchResultadoAtual } = await import("@/lib/api");
    const r = await fetchResultadoAtual({ skipCache: true });
    expect(r.isMock).toBe(true);
    expect(r.data.fase_atual).toBe(MOCK_RESULTADO.fase_atual);
  });
  it("fetchResultadoAtual uses cache", async () => {
    const { fetchResultadoAtual } = await import("@/lib/api");
    const { setCache } = await import("@/lib/cache");
    setCache(cacheKeys.resultado.data, MOCK_RESULTADO, cacheKeys.resultado.ts);
    const r = await fetchResultadoAtual();
    expect(r.fromCache).toBe(true);
  });
  it("fetchHistorico returns mock series", async () => {
    const { fetchHistorico } = await import("@/lib/api");
    const r = await fetchHistorico();
    expect(r.isMock).toBe(true);
    expect(r.data.length).toBeGreaterThan(0);
  });
  it("fetchSnapshot returns semiannual mock", async () => {
    const { fetchSnapshot } = await import("@/lib/api");
    const r = await fetchSnapshot("semiannual", { skipCache: true });
    expect(r.isMock).toBe(true);
    expect(r.data?.janela).toBe("semiannual");
  });

  it("fetchRanking returns top-10 mock", async () => {
    const { fetchRanking } = await import("@/lib/api");
    const r = await fetchRanking("besta_mar", { skipCache: true });
    expect(r.isMock).toBe(true);
    expect(r.data).toHaveLength(10);
  });

  it("falls back to mock when fetch fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const { fetchResultadoAtual } = await import("@/lib/api");
    const r = await fetchResultadoAtual({ skipCache: true });
    expect(r.isMock).toBe(true);
  });
});
