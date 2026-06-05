import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSplineSceneAvailability } from "@/hooks/useSplineSceneAvailability";

describe("useSplineSceneAvailability", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("permanece em checking quando URL está vazia", () => {
    const { result } = renderHook(() => useSplineSceneAvailability("   "));

    expect(result.current).toBe("checking");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("marca unavailable para arquivo .spline do editor", async () => {
    const { result } = renderHook(() =>
      useSplineSceneAvailability("/biblically_accurate_angel.spline"),
    );

    await waitFor(() => {
      expect(result.current).toBe("unavailable");
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("marca ready quando probe HEAD retorna ok", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });

    const { result } = renderHook(() =>
      useSplineSceneAvailability("/scene.splinecode"),
    );

    await waitFor(() => {
      expect(result.current).toBe("ready");
    });
    expect(fetchMock).toHaveBeenCalledWith("/scene.splinecode", {
      method: "HEAD",
      cache: "no-store",
    });
  });

  it("tenta GET quando HEAD retorna 405", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 405 })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const { result } = renderHook(() =>
      useSplineSceneAvailability("https://prod.spline.design/abc/scene.splinecode"),
    );

    await waitFor(() => {
      expect(result.current).toBe("ready");
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("marca unavailable quando probe falha", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network"));

    const { result } = renderHook(() =>
      useSplineSceneAvailability("/missing.splinecode"),
    );

    await waitFor(() => {
      expect(result.current).toBe("unavailable");
    });
  });

  it("revalida quando sceneUrl muda", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    const { result, rerender } = renderHook(
      ({ url }) => useSplineSceneAvailability(url),
      { initialProps: { url: "/a.splinecode" } },
    );

    await waitFor(() => expect(result.current).toBe("ready"));

    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: false, status: 404 });

    rerender({ url: "/b.splinecode" });

    await waitFor(() => expect(result.current).toBe("unavailable"));
    expect(fetchMock).toHaveBeenCalled();
  });
});
