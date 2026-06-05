import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSplineCompanionPosition } from "@/hooks/useSplineCompanionPosition";
import { PIN_DURATION_MS, SCROLL_STOP_DELAY_MS } from "@/lib/utils/constants";
import { lateralPoint } from "@/lib/utils/geometry";

const SIZE = { width: 200, height: 260 };

function setViewport(width: number, height = 800) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    writable: true,
    configurable: true,
    value: height,
  });
}

function setScrollY(value: number) {
  Object.defineProperty(window, "scrollY", {
    writable: true,
    configurable: true,
    value,
  });
}

describe("useSplineCompanionPosition", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setViewport(1280, 800);
    setScrollY(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    setViewport(1280, 800);
    setScrollY(0);
  });

  it("initializes at left lateral position on desktop", () => {
    const expected = lateralPoint("left", SIZE);
    const { result } = renderHook(() => useSplineCompanionPosition(SIZE));

    expect(result.current.position).toEqual(expected);
    expect(result.current.transitionEnabled).toBe(false);
    expect(result.current.isScrolling).toBe(false);
  });

  it("moves to mouse position on double click", () => {
    const { result } = renderHook(() => useSplineCompanionPosition(SIZE));

    act(() => {
      window.dispatchEvent(
        new MouseEvent("dblclick", { clientX: 420, clientY: 310, bubbles: true }),
      );
    });

    expect(result.current.transitionEnabled).toBe(true);
    expect(result.current.position.x).toBe(420 - SIZE.width / 2);
    expect(result.current.position.y).toBe(310 - SIZE.height / 2);
  });

  it("sets isScrolling during scroll on desktop", () => {
    const { result } = renderHook(() => useSplineCompanionPosition(SIZE));

    act(() => {
      setScrollY(50);
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current.isScrolling).toBe(true);
    expect(result.current.transitionEnabled).toBe(false);
  });

  it("switches lateral side after scroll stops", () => {
    const { result } = renderHook(() => useSplineCompanionPosition(SIZE));
    const initial = lateralPoint("left", SIZE);

    act(() => {
      setScrollY(80);
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current.isScrolling).toBe(true);

    act(() => {
      vi.advanceTimersByTime(SCROLL_STOP_DELAY_MS + 10);
    });

    expect(result.current.isScrolling).toBe(false);
    expect(result.current.transitionEnabled).toBe(true);
    expect(result.current.position).toEqual(lateralPoint("right", SIZE));
    expect(initial).toEqual(lateralPoint("left", SIZE));
  });

  it("ignores scroll on mobile viewport", () => {
    setViewport(390, 800);
    const { result } = renderHook(() => useSplineCompanionPosition(SIZE));
    const before = result.current.position;

    act(() => {
      setScrollY(200);
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current.isScrolling).toBe(false);
    expect(result.current.position).toEqual(before);
  });

  it("unpins position after PIN_DURATION_MS on double click", () => {
    const { result } = renderHook(() => useSplineCompanionPosition(SIZE));

    act(() => {
      window.dispatchEvent(
        new MouseEvent("dblclick", { clientX: 300, clientY: 250, bubbles: true }),
      );
    });

    const pinned = { ...result.current.position };

    act(() => {
      vi.advanceTimersByTime(PIN_DURATION_MS + 10);
    });

    expect(result.current.transitionEnabled).toBe(true);
    expect(result.current.position).not.toEqual(pinned);
    expect(result.current.position).toEqual(lateralPoint("left", SIZE));
  });

  it("updates position when size changes after resize", () => {
    const { result, rerender } = renderHook(
      ({ size }) => useSplineCompanionPosition(size),
      { initialProps: { size: SIZE } },
    );

    const newSize = { width: 120, height: 160 };
    rerender({ size: newSize });

    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current.position).toEqual(lateralPoint("left", newSize));
  });
});
