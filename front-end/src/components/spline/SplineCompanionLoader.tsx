"use client";

import dynamic from "next/dynamic";

const SplineCompanionRoot = dynamic(() => import("./SplineCompanionRoot"), { ssr: false });

export function SplineCompanionLoader() {
  return <SplineCompanionRoot />;
}
