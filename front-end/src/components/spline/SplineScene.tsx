"use client";

import { Suspense } from "react";
import Spline from "@splinetool/react-spline";

import { SplineErrorBoundary } from "./SplineErrorBoundary";
import { SplineSceneFallback } from "./SplineSceneFallback";

interface SplineSceneProps {
  scene: string;
  onError?: () => void;
}

export default function SplineScene({ scene, onError }: SplineSceneProps) {
  return (
    <SplineErrorBoundary onError={onError}>
      <div className="relative h-full w-full overflow-hidden bg-transparent">
        <Suspense fallback={<SplineSceneFallback />}>
          <Spline scene={scene} style={{ width: "100%", height: "100%", zIndex: 1000 }} />
        </Suspense>
      </div>
    </SplineErrorBoundary>
  );
}
