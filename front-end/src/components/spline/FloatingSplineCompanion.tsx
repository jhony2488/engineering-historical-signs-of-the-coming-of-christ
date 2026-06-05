"use client";

import { useSplineCompanionPosition } from "@/hooks/useSplineCompanionPosition";

import { SCENE_SIZE } from "./constants";
import { LazySplineScene } from "./LazySplineScene";

export function FloatingSplineCompanion() {
  const { position, transitionEnabled } = useSplineCompanionPosition();

  return (
    <div
      className="pointer-events-none fixed z-40 will-change-transform"
      style={{
        width: SCENE_SIZE.width,
        height: SCENE_SIZE.height,
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        transition: transitionEnabled
          ? "transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)"
          : "none",
      }}
      aria-hidden
    >
      <LazySplineScene />
    </div>
  );
}
