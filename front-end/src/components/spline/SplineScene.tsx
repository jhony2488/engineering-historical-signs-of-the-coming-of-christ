"use client";

import { Suspense } from "react";
import Spline from "@splinetool/react-spline";

import { SPLINE_SCENE_PATH } from "./constants";
import { SplineSceneFallback } from "./SplineSceneFallback";

export default function SplineScene() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl bg-transparent">
      <Suspense fallback={<SplineSceneFallback />}>
        <Spline scene={SPLINE_SCENE_PATH} style={{ width: "100%", height: "100%" }} />
      </Suspense>
    </div>
  );
}
