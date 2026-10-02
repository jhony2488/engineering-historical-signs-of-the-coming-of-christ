import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function importModule() {
  return import("@/lib/spline-scene-cache");
}

function mockResponse({
  ok = true,
  status = 200,
  headers = {},
  data = new ArrayBuffer(8),
}: {
  ok?: boolean;
  status?: number;
  headers?: Record<string, string>;
  data?: ArrayBuffer;
} = {}) {
  return {
    ok,
    status,
    headers: { get: (key: string) => headers[key.toLowerCase()] ?? null },
    arrayBuffer: async () => data,
  };
}

describe("spline-scene-cache", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("indexedDB", new IDBFactory());
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
    fetchMock.mockReset();
  });

  it("stores and reads back the scene buffer", async () => {
    const { getSplineScene, putSplineScene } = await importModule();

    const data = new ArrayBuffer(16);
    await putSplineScene("/scene.spline", data, {
      etag: '"abc"',
      lastModified: "Mon, 01 Jan 2024",
    });

    const record = await getSplineScene("/scene.spline");
    expect(record).not.toBeNull();
    expect(record?.data.byteLength).toBe(16);
    expect(record?.etag).toBe('"abc"');
    expect(record?.lastModified).toBe("Mon, 01 Jan 2024");
  });

  it("returns null for a record cached under another version", async () => {
    const { putSplineScene } = await importModule();
    await putSplineScene("/scene.spline", new ArrayBuffer(4));

    vi.stubEnv("NEXT_PUBLIC_SPLINE_CACHE_VERSION", "2");
    vi.resetModules();
    const { getSplineScene } = await importModule();

    expect(await getSplineScene("/scene.spline")).toBeNull();
  });

  it("returns null when IndexedDB is unavailable", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const { getSplineScene, putSplineScene } = await importModule();

    await putSplineScene("/scene.spline", new ArrayBuffer(4));
    expect(await getSplineScene("/scene.spline")).toBeNull();
  });

  it("fetchSplineScene captures validators and dedupes inflight calls", async () => {
    fetchMock.mockResolvedValue(
      mockResponse({ headers: { etag: '"x"', "last-modified": "D1" } }),
    );
    const { fetchSplineScene } = await importModule();

    const [a, b] = await Promise.all([
      fetchSplineScene("/scene.spline"),
      fetchSplineScene("/scene.spline"),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(a?.data.byteLength).toBe(8);
    expect(a?.etag).toBe('"x"');
    expect(a?.lastModified).toBe("D1");
  });

  it("fetchSplineScene returns null on http or network failure", async () => {
    const { fetchSplineScene } = await importModule();

    fetchMock.mockResolvedValueOnce(mockResponse({ ok: false, status: 404 }));
    expect(await fetchSplineScene("/a.spline")).toBeNull();

    fetchMock.mockRejectedValueOnce(new Error("offline"));
    expect(await fetchSplineScene("/b.spline")).toBeNull();
  });

  describe("probeSplineSceneChanged", () => {
    const record = {
      key: "/scene.spline",
      data: new ArrayBuffer(10),
      version: "1",
      etag: '"old"',
      lastModified: "D1",
      cachedAt: 0,
    };

    it("returns false when the etag is unchanged", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse({ headers: { etag: '"old"' } }));
      const { probeSplineSceneChanged } = await importModule();

      expect(await probeSplineSceneChanged("/scene.spline", record)).toBe(false);
      expect(fetchMock).toHaveBeenCalledWith("/scene.spline", {
        method: "HEAD",
        cache: "no-store",
      });
    });

    it("returns true when the etag changed", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse({ headers: { etag: '"new"' } }));
      const { probeSplineSceneChanged } = await importModule();

      expect(await probeSplineSceneChanged("/scene.spline", record)).toBe(true);
    });

    it("falls back to content-length when validators are missing", async () => {
      const noValidators = {
        ...record,
        etag: null,
        lastModified: null,
      };
      const { probeSplineSceneChanged } = await importModule();

      fetchMock.mockResolvedValueOnce(
        mockResponse({ headers: { "content-length": "10" } }),
      );
      expect(await probeSplineSceneChanged("/scene.spline", noValidators)).toBe(false);

      fetchMock.mockResolvedValueOnce(
        mockResponse({ headers: { "content-length": "999" } }),
      );
      expect(await probeSplineSceneChanged("/scene.spline", noValidators)).toBe(true);
    });
  });

  it("refreshSplineScene downloads and stores the new version when changed", async () => {
    const { getSplineScene, putSplineScene, refreshSplineScene } =
      await importModule();

    await putSplineScene("/scene.spline", new ArrayBuffer(4), { etag: '"old"' });

    fetchMock
      .mockResolvedValueOnce(mockResponse({ headers: { etag: '"new"' } }))
      .mockResolvedValueOnce(
        mockResponse({ headers: { etag: '"new"' }, data: new ArrayBuffer(32) }),
      );

    const record = await getSplineScene("/scene.spline");
    await refreshSplineScene("/scene.spline", record!);

    const updated = await getSplineScene("/scene.spline");
    expect(updated?.etag).toBe('"new"');
    expect(updated?.data.byteLength).toBe(32);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("refreshSplineScene does not download when unchanged", async () => {
    const { getSplineScene, putSplineScene, refreshSplineScene } =
      await importModule();

    await putSplineScene("/scene.spline", new ArrayBuffer(4), { etag: '"same"' });
    fetchMock.mockResolvedValueOnce(mockResponse({ headers: { etag: '"same"' } }));

    const record = await getSplineScene("/scene.spline");
    await refreshSplineScene("/scene.spline", record!);

    expect(fetchMock).toHaveBeenCalledTimes(1); // só o HEAD
  });
});
