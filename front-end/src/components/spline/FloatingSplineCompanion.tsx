"use client";

import { useEffect, useRef, useState } from "react";

import { useResponsiveSceneSize } from "@/hooks/useResponsiveSceneSize";
import { useSplineCelebration } from "@/hooks/useSplineCelebration";
import { useSplineCompanionPosition } from "@/hooks/useSplineCompanionPosition";

import { SCENE_SIZE } from "../../lib/utils/constants";
import { LazySplineScene } from "./LazySplineScene";

export function FloatingSplineCompanion() {
  const responsiveSize = useResponsiveSceneSize({ SCENE_SIZE });
  const celebration = useSplineCelebration(responsiveSize);
  const activeSize = celebration.active ? celebration.size : responsiveSize;
  const { position, transitionEnabled } = useSplineCompanionPosition(activeSize);
  const activePosition = celebration.active ? celebration.position : position;

  const isMobile = activeSize.width <= 100;
  const sceneUrl = isMobile
    ? "/biblically_accurate_angel_eyes_and_rings-2.spline"
    : "/biblically_accurate_angel_eyes_and_rings.spline";
  const innerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const onPlay = () => setIsPlaying(true);
    const onStop = () => setIsPlaying(false);
    window.addEventListener("audio-play", onPlay);
    window.addEventListener("audio-stop", onStop);
    return () => {
      window.removeEventListener("audio-play", onPlay);
      window.removeEventListener("audio-stop", onStop);
    };
  }, []);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;

    const block = () => {
      el.style.pointerEvents = "none";
    };
    const unblock = () => {
      el.style.pointerEvents = "auto";
    };

    window.addEventListener("scroll", block, { passive: true });
    window.addEventListener("touchstart", block, { passive: true });
    window.addEventListener("touchend", unblock, { passive: true });
    window.addEventListener("touchcancel", unblock, { passive: true });

    return () => {
      window.removeEventListener("scroll", block);
      window.removeEventListener("touchstart", block);
      window.removeEventListener("touchend", unblock);
      window.removeEventListener("touchcancel", unblock);
    };
  }, []);

  const showSoundRings = isPlaying;

  return (
    <div
      className={`pointer-events-none fixed will-change-transform ${
        celebration.active ? "z-50" : "z-40"
      }`}
      style={{
        width: activeSize.width,
        height: activeSize.height,
        transform: `translate3d(${activePosition.x}px, ${activePosition.y}px, 0)`,
        transition:
          celebration.active || transitionEnabled
            ? "transform 0.9s cubic-bezier(0.22, 1, 0.36, 1), width 0.9s cubic-bezier(0.22, 1, 0.36, 1), height 0.9s cubic-bezier(0.22, 1, 0.36, 1)"
            : "none",
      }}
      aria-hidden
    >
      {showSoundRings && (
        <>
          <span className="sound-ring sound-ring-1" />
          <span className="sound-ring sound-ring-2" />
          <span className="sound-ring sound-ring-3" />
        </>
      )}
      <div ref={innerRef} className="pointer-events-auto h-full w-full">
        <LazySplineScene scene={sceneUrl} />
      </div>
    </div>
  );
}
