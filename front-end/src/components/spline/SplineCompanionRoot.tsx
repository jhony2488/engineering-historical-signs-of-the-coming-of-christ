"use client";

import { usePathname } from "next/navigation";

import { HIDDEN_ROUTE_PREFIXES } from "./constants";
import { FloatingSplineCompanion } from "./FloatingSplineCompanion";

export default function SplineCompanionRoot() {
  const pathname = usePathname() ?? "/";

  const hidden = HIDDEN_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (hidden) return null;

  return <FloatingSplineCompanion />;
}
