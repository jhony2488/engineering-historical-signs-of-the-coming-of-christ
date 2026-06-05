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

  it("stays in checking when URL is empty", () => {
    const { result } = renderHook(() => useSplineSceneAvailability("   "));

    expect(result.current).toBe("checking");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("marks unavailable for editor .spline file", async () => {
    const { result } = renderHook(() =>
      useSplineSceneAvailability("/biblically_accurate_angel.spline"),
    );

    await waitFor(() => {
      expect(result.current).toBe("unavailable");
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("marks ready when HEAD probe succeeds", async () => {
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

  it("falls back to GET when HEAD returns 405", async () => {
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

  it("marks unavailable when probe fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network"));

    const { result } = renderHook(() =>
      useSplineSceneAvailability("/missing.splinecode"),
    );

    await waitFor(() => {
      expect(result.current).toBe("unavailable");
    });
  });

  it("revalidates when sceneUrl changes", async () => {
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
