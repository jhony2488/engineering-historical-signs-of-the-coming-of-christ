"use client";

import { useEffect } from "react";

/**
 * Registra /sw.js apenas em produção — em dev o SW mascararia o hot reload
 * e caches stale atrapalhariam a iteração.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (process.env.NEXT_PUBLIC_SW_DISABLED === "true") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // best-effort: falha de registro nunca quebra a página
    });
  }, []);

  return null;
}
