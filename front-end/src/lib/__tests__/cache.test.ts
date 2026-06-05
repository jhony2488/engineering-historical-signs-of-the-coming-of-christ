import { beforeEach, describe, expect, it } from "vitest";
import {
  cacheKeys,
  clearCache,
  getCached,
  getStaleCached,
  isCacheExpired,
  setCache,
} from "@/lib/cache";

describe("cache", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("retorna null quando cache está vazio", () => {
    expect(getCached(cacheKeys.resultado.data, cacheKeys.resultado.ts)).toBeNull();
    expect(isCacheExpired(cacheKeys.resultado.ts)).toBe(true);
  });

  it("armazena e recupera dados no mesmo dia", () => {
    const payload = { indice_global: 0.58 };
    setCache(cacheKeys.resultado.data, payload, cacheKeys.resultado.ts);

    expect(isCacheExpired(cacheKeys.resultado.ts)).toBe(false);
    expect(getCached(cacheKeys.resultado.data, cacheKeys.resultado.ts)).toEqual(payload);
  });

  it("expira cache de dia anterior", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    localStorage.setItem(cacheKeys.resultado.data, JSON.stringify({ ok: true }));
    localStorage.setItem(cacheKeys.resultado.ts, yesterday.getTime().toString());

    expect(isCacheExpired(cacheKeys.resultado.ts)).toBe(true);
    expect(getCached(cacheKeys.resultado.data, cacheKeys.resultado.ts)).toBeNull();
  });

  it("limpa cache corretamente", () => {
    setCache(cacheKeys.resultado.data, { x: 1 }, cacheKeys.resultado.ts);
    clearCache(cacheKeys.resultado.data, cacheKeys.resultado.ts);

    expect(localStorage.getItem(cacheKeys.resultado.data)).toBeNull();
    expect(isCacheExpired(cacheKeys.resultado.ts)).toBe(true);
  });

  it("getStaleCached ignora expiração", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    localStorage.setItem(cacheKeys.resultado.data, JSON.stringify({ stale: true }));
    localStorage.setItem(cacheKeys.resultado.ts, yesterday.getTime().toString());

    expect(getCached(cacheKeys.resultado.data, cacheKeys.resultado.ts)).toBeNull();
    expect(getStaleCached(cacheKeys.resultado.data)).toEqual({ stale: true });
  });

  it("retorna null para JSON inválido", () => {
    localStorage.setItem(cacheKeys.resultado.data, "not-json");
    localStorage.setItem(cacheKeys.resultado.ts, Date.now().toString());

    expect(getCached(cacheKeys.resultado.data, cacheKeys.resultado.ts)).toBeNull();
  });
});
