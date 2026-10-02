import { renderHook, waitFor } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCachedSplineScene } from "@/hooks/useCachedSplineScene";
import { getSplineScene, putSplineScene } from "@/lib/spline-scene-cache";

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

describe("useCachedSplineScene", () => {
  const SCENE_URL = "/scene.spline";
  const fetchMock = vi.fn();
  const createObjectURLMock = vi.fn(() => "blob:scene");
  const revokeObjectURLMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("indexedDB", new IDBFactory());
    vi.stubGlobal("fetch", fetchMock);
    URL.createObjectURL = createObjectURLMock;
    URL.revokeObjectURL = revokeObjectURLMock;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    createObjectURLMock.mockReset();
    revokeObjectURLMock.mockReset();
  });

  it("miss: baixa a cena, serve blob URL e grava no IndexedDB", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ headers: { etag: '"v1"' }, data: new ArrayBuffer(12) }),
    );

    const { result } = renderHook(() => useCachedSplineScene(SCENE_URL));

    await waitFor(() => expect(result.current.url).toBe("blob:scene"));
    expect(result.current.fromCache).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(SCENE_URL, { cache: "no-store" });

    await waitFor(async () => {
      const record = await getSplineScene(SCENE_URL);
      expect(record?.data.byteLength).toBe(12);
      expect(record?.etag).toBe('"v1"');
    });
  });

  it("hit: serve do IndexedDB sem GET — só revalida com HEAD", async () => {
    await putSplineScene(SCENE_URL, new ArrayBuffer(6), { etag: '"v1"' });
    fetchMock.mockResolvedValueOnce(mockResponse({ headers: { etag: '"v1"' } }));

    const { result } = renderHook(() => useCachedSplineScene(SCENE_URL));

    await waitFor(() => expect(result.current.url).toBe("blob:scene"));
    expect(result.current.fromCache).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(SCENE_URL, {
      method: "HEAD",
      cache: "no-store",
    });
  });

  it("hit com etag mudado: baixa em background e atualiza o cache", async () => {
    await putSplineScene(SCENE_URL, new ArrayBuffer(4), { etag: '"old"' });
    fetchMock
      .mockResolvedValueOnce(mockResponse({ headers: { etag: '"new"' } }))
      .mockResolvedValueOnce(
        mockResponse({ headers: { etag: '"new"' }, data: new ArrayBuffer(20) }),
      );

    const { result } = renderHook(() => useCachedSplineScene(SCENE_URL));

    await waitFor(() => expect(result.current.url).toBe("blob:scene"));

    await waitFor(async () => {
      const record = await getSplineScene(SCENE_URL);
      expect(record?.etag).toBe('"new"');
      expect(record?.data.byteLength).toBe(20);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("sem IndexedDB e fetch falhando: cai para a URL original", async () => {
    vi.stubGlobal("indexedDB", undefined);
    fetchMock.mockRejectedValueOnce(new Error("offline"));

    const { result } = renderHook(() => useCachedSplineScene(SCENE_URL));

    await waitFor(() => expect(result.current.url).toBe(SCENE_URL));
    expect(result.current.fromCache).toBe(false);
    expect(createObjectURLMock).not.toHaveBeenCalled();
  });

  it("revoga o object URL ao desmontar", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse());

    const { result, unmount } = renderHook(() =>
      useCachedSplineScene(SCENE_URL),
    );
    await waitFor(() => expect(result.current.url).toBe("blob:scene"));

    unmount();
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:scene");
  });
});
