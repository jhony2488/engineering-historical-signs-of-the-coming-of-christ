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

  it("returns null when cache is empty", () => {
    expect(getCached(cacheKeys.resultado.data, cacheKeys.resultado.ts)).toBeNull();
    expect(isCacheExpired(cacheKeys.resultado.ts)).toBe(true);
  });

  it("stores and retrieves data on the same day", () => {
    const payload = { indice_global: 0.58 };
    setCache(cacheKeys.resultado.data, payload, cacheKeys.resultado.ts);

    expect(isCacheExpired(cacheKeys.resultado.ts)).toBe(false);
    expect(getCached(cacheKeys.resultado.data, cacheKeys.resultado.ts)).toEqual(payload);
  });

  it("expires cache from previous day", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    localStorage.setItem(cacheKeys.resultado.data, JSON.stringify({ ok: true }));
    localStorage.setItem(cacheKeys.resultado.ts, yesterday.getTime().toString());

    expect(isCacheExpired(cacheKeys.resultado.ts)).toBe(true);
    expect(getCached(cacheKeys.resultado.data, cacheKeys.resultado.ts)).toBeNull();
  });

  it("clears cache correctly", () => {
    setCache(cacheKeys.resultado.data, { x: 1 }, cacheKeys.resultado.ts);
    clearCache(cacheKeys.resultado.data, cacheKeys.resultado.ts);

    expect(localStorage.getItem(cacheKeys.resultado.data)).toBeNull();
    expect(isCacheExpired(cacheKeys.resultado.ts)).toBe(true);
  });

  it("getStaleCached ignores expiration", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    localStorage.setItem(cacheKeys.resultado.data, JSON.stringify({ stale: true }));
    localStorage.setItem(cacheKeys.resultado.ts, yesterday.getTime().toString());

    expect(getCached(cacheKeys.resultado.data, cacheKeys.resultado.ts)).toBeNull();
    expect(getStaleCached(cacheKeys.resultado.data)).toEqual({ stale: true });
  });

  it("returns null for invalid JSON", () => {
    localStorage.setItem(cacheKeys.resultado.data, "not-json");
    localStorage.setItem(cacheKeys.resultado.ts, Date.now().toString());

    expect(getCached(cacheKeys.resultado.data, cacheKeys.resultado.ts)).toBeNull();
  });
});
