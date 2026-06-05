"use client";

import { useEffect, useState } from "react";

import {
  SPLINE_CELEBRATION_END,
  SPLINE_CELEBRATION_START,
  computeCelebrationCenterPosition,
  computeCelebrationSceneSize,
} from "@/lib/spline-celebration";
import type { Point, SceneSize } from "@/lib/utils/geometry";

type CelebrationState = {
  active: boolean;
  size: SceneSize;
  position: Point;
};

const IDLE: CelebrationState = {
  active: false,
  size: { width: 0, height: 0 },
  position: { x: 0, y: 0 },
};

export function useSplineCelebration(fallbackSize: SceneSize): CelebrationState {
  const [state, setState] = useState<CelebrationState>(IDLE);

  useEffect(() => {
    const baseSize = fallbackSize;

    function syncCelebration(size: SceneSize) {
      const nextSize = computeCelebrationSceneSize(size);
      setState({
        active: true,
        size: nextSize,
        position: computeCelebrationCenterPosition(nextSize),
      });
    }

    const onStart = (event: Event) => {
      const detail = (event as CustomEvent<{ baseSize?: SceneSize } | undefined>).detail;
      syncCelebration(detail?.baseSize ?? baseSize);
    };

    const onEnd = () => {
      setState(IDLE);
    };

    const onResize = () => {
      setState((current) => {
        if (!current.active) return current;
        const nextSize = computeCelebrationSceneSize(baseSize);
        return {
          active: true,
          size: nextSize,
          position: computeCelebrationCenterPosition(nextSize),
        };
      });
    };

    window.addEventListener(SPLINE_CELEBRATION_START, onStart);
    window.addEventListener(SPLINE_CELEBRATION_END, onEnd);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener(SPLINE_CELEBRATION_START, onStart);
      window.removeEventListener(SPLINE_CELEBRATION_END, onEnd);
      window.removeEventListener("resize", onResize);
    };
  }, [fallbackSize]);

  return state;
}
