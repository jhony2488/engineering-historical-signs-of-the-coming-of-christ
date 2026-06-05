"use client";

import { useEffect, useState } from "react";

import { isSplineRuntimeSceneUrl } from "@/lib/utils/resolveSplineSceneUrl";

export type SplineSceneStatus = "checking" | "ready" | "unavailable";

const warnedMessages = new Set<string>();

function warnOnce(message: string) {
  if (process.env.NODE_ENV !== "development") return;
  if (warnedMessages.has(message)) return;
  warnedMessages.add(message);
  console.warn(message);
}

async function probeSceneUrl(url: string): Promise<boolean> {
  if (!url.trim()) {
    return false;
  }

  try {
    const head = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (head.ok) return true;
    if (head.status === 405 || head.status === 404) {
      const get = await fetch(url, { method: "GET", cache: "no-store" });
      return get.ok;
    }
    return false;
  } catch {
    return false;
  }
}

export function useSplineSceneAvailability(sceneUrl: string): SplineSceneStatus {
  const [status, setStatus] = useState<SplineSceneStatus>("checking");

  useEffect(() => {
    let cancelled = false;
    const normalizedUrl = sceneUrl.trim();

    if (!normalizedUrl) {
      setStatus("checking");
      return;
    }

    if (!isSplineRuntimeSceneUrl(normalizedUrl)) {
      setStatus("unavailable");
      warnOnce(
        "[Spline] O arquivo .spline e so do editor. No Spline: Export -> Code -> React, " +
          "baixe scene.splinecode para public/ ou defina NEXT_PUBLIC_SPLINE_SCENE_URL.",
      );
      return;
    }

    probeSceneUrl(normalizedUrl).then((ok) => {
      if (cancelled) return;
      setStatus(ok ? "ready" : "unavailable");
      if (!ok) {
        warnOnce(
          `[Spline] Cena indisponivel: ${normalizedUrl}. ` +
            "Adicione o .splinecode em public/ ou NEXT_PUBLIC_SPLINE_SCENE_URL no .env.local",
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [sceneUrl]);

  return status;
}
