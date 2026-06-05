"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";

import { SplineSceneFallback } from "./SplineSceneFallback";

const SplineScene = lazy(() => import("./SplineScene"));

interface LazySplineSceneProps {
  scene: string;
  onError?: () => void;
}

export function LazySplineScene({ scene, onError }: LazySplineSceneProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin: "250px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} className="h-full w-full">
      <Suspense fallback={<SplineSceneFallback />}>
        {shouldRender ? <SplineScene scene={scene} onError={onError} /> : <SplineSceneFallback />}
      </Suspense>
    </div>
  );
}
