import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useResponsiveSceneSize } from "@/hooks/useResponsiveSceneSize";

const SCENE_SIZE = { width: 200, height: 260 };

function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
}

describe("useResponsiveSceneSize", () => {
  afterEach(() => {
    setViewport(1280);
  });

  it("returns desktop size (SCENE_SIZE) on wide viewport", () => {
    setViewport(1280);
    const { result } = renderHook(() => useResponsiveSceneSize({ SCENE_SIZE }));

    expect(result.current).toEqual(SCENE_SIZE);
  });

  it("returns tablet size between 640px and 1023px", () => {
    setViewport(800);
    const { result } = renderHook(() => useResponsiveSceneSize({ SCENE_SIZE }));

    expect(result.current).toEqual({ width: 130, height: 170 });
  });

  it("returns mobile size below 640px", () => {
    setViewport(390);
    const { result } = renderHook(() => useResponsiveSceneSize({ SCENE_SIZE }));

    expect(result.current).toEqual({ width: 100, height: 130 });
  });

  it("updates size when window is resized", () => {
    setViewport(1280);
    const { result } = renderHook(() => useResponsiveSceneSize({ SCENE_SIZE }));

    expect(result.current).toEqual(SCENE_SIZE);

    act(() => {
      setViewport(500);
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current).toEqual({ width: 100, height: 130 });
  });

  it("reacts when SCENE_SIZE changes", () => {
    setViewport(1280);
    const custom = { width: 180, height: 220 };
    const { result, rerender } = renderHook(
      ({ size }) => useResponsiveSceneSize({ SCENE_SIZE: size }),
      { initialProps: { size: SCENE_SIZE } },
    );

    rerender({ size: custom });
    expect(result.current).toEqual(custom);
  });
});
