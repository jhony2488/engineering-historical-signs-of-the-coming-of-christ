"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  PIN_DURATION_MS,
  SCROLL_DISTANCE_FOR_CENTER,
  SCROLL_STOP_DELAY_MS,
} from "@/components/spline/constants";
import {
  arcPoint,
  footerCenterPoint,
  lateralPoint,
  pointFromMouse,
  type LateralSide,
  type Point,
} from "@/components/spline/geometry";

export function useSplineCompanionPosition() {
  const [position, setPosition] = useState<Point>({ x: 20, y: 200 });
  const [transitionEnabled, setTransitionEnabled] = useState(false);

  const lateralSideRef = useRef<LateralSide>("left");
  const scrollOriginSideRef = useRef<LateralSide>("left");
  const scrollAccumulatorRef = useRef(0);
  const isScrollingRef = useRef(false);
  const isPinnedRef = useRef(false);
  const scrollStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollYRef = useRef(0);

  const applyLateral = useCallback((side: LateralSide, animate: boolean) => {
    lateralSideRef.current = side;
    setTransitionEnabled(animate);
    setPosition(lateralPoint(side));
  }, []);

  const syncInitialPosition = useCallback(() => {
    if (isPinnedRef.current) return;
    setTransitionEnabled(false);
    setPosition(lateralPoint(lateralSideRef.current));
  }, []);

  useEffect(() => {
    syncInitialPosition();
    lastScrollYRef.current = window.scrollY;

    const clearScrollStopTimer = () => {
      if (scrollStopTimerRef.current) {
        clearTimeout(scrollStopTimerRef.current);
        scrollStopTimerRef.current = null;
      }
    };

    const onScrollStop = () => {
      if (isPinnedRef.current) return;

      isScrollingRef.current = false;
      scrollAccumulatorRef.current = 0;

      const nextSide: LateralSide =
        lateralSideRef.current === "left" ? "right" : "left";
      applyLateral(nextSide, true);
    };

    const onScroll = () => {
      if (isPinnedRef.current) return;

      const currentY = window.scrollY;
      const delta = Math.abs(currentY - lastScrollYRef.current);
      lastScrollYRef.current = currentY;

      if (delta < 0.5) return;

      if (!isScrollingRef.current) {
        isScrollingRef.current = true;
        scrollOriginSideRef.current = lateralSideRef.current;
        scrollAccumulatorRef.current = 0;
      }

      scrollAccumulatorRef.current += delta;
      const progress = Math.min(1, scrollAccumulatorRef.current / SCROLL_DISTANCE_FOR_CENTER);
      const from = lateralPoint(scrollOriginSideRef.current);
      const to = footerCenterPoint();

      setTransitionEnabled(false);
      setPosition(arcPoint(progress, from, to));

      clearScrollStopTimer();
      scrollStopTimerRef.current = setTimeout(onScrollStop, SCROLL_STOP_DELAY_MS);
    };

    const onDoubleClick = (event: MouseEvent) => {
      if (pinTimerRef.current) clearTimeout(pinTimerRef.current);

      isPinnedRef.current = true;
      clearScrollStopTimer();
      isScrollingRef.current = false;
      scrollAccumulatorRef.current = 0;

      setTransitionEnabled(true);
      setPosition(pointFromMouse(event.clientX, event.clientY));

      pinTimerRef.current = setTimeout(() => {
        isPinnedRef.current = false;
        applyLateral(lateralSideRef.current, true);
      }, PIN_DURATION_MS);
    };

    const onResize = () => {
      if (isPinnedRef.current) return;
      if (isScrollingRef.current) {
        const progress = Math.min(1, scrollAccumulatorRef.current / SCROLL_DISTANCE_FOR_CENTER);
        const from = lateralPoint(scrollOriginSideRef.current);
        const to = footerCenterPoint();
        setPosition(arcPoint(progress, from, to));
        return;
      }
      syncInitialPosition();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("dblclick", onDoubleClick);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("dblclick", onDoubleClick);
      window.removeEventListener("resize", onResize);
      clearScrollStopTimer();
      if (pinTimerRef.current) clearTimeout(pinTimerRef.current);
    };
  }, [applyLateral, syncInitialPosition]);

  return { position, transitionEnabled };
}
