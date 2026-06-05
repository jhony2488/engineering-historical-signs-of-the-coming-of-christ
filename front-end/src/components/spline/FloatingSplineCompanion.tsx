"use client";

import { useEffect, useRef, useState } from "react";

import { useSplineCompanionPosition } from "@/hooks/useSplineCompanionPosition";

import { SCENE_SIZE } from "../../lib/utils/constants";
import { LazySplineScene } from "./LazySplineScene";
import { useResponsiveSceneSize } from "@/hooks/useResponsiveSceneSize";


export function FloatingSplineCompanion() {
  const size = useResponsiveSceneSize({ SCENE_SIZE });
  const { position, transitionEnabled } = useSplineCompanionPosition(size);
  const isMobile = size.width <= 100;
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

    const block = () => { el.style.pointerEvents = "none"; };
    const unblock = () => { el.style.pointerEvents = "auto"; };

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

  return (
    <div
      className="pointer-events-none fixed z-40 will-change-transform"
      style={{
        width: size.width,
        height: size.height,
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        transition: transitionEnabled
          ? "transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)"
          : "none",
      }}
      aria-hidden
    >
      {isPlaying && (
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
