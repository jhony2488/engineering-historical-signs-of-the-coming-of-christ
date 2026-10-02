"use client";

import { useEffect, useRef, useState } from "react";

import {
  fetchSplineScene,
  getSplineScene,
  putSplineScene,
  refreshSplineScene,
} from "@/lib/spline-scene-cache";

export interface CachedSplineScene {
  /** URL pronta para `<Spline scene>` — `blob:` quando servida via IndexedDB/fetch. */
  url: string | null;
  fromCache: boolean;
}

/**
 * Resolve a URL da cena servindo-a do IndexedDB quando possível:
 * - hit: usa blob local na hora e revalida em background (ETag/Last-Modified);
 * - miss: baixa, grava no IndexedDB e usa blob local;
 * - falha/IDB indisponível: devolve `sourceUrl` (comportamento anterior).
 */
export function useCachedSplineScene(sourceUrl: string): CachedSplineScene {
  const [resolved, setResolved] = useState<CachedSplineScene>({
    url: null,
    fromCache: false,
  });
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const revoke = () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };

    const applyBlob = (data: ArrayBuffer, fromCache: boolean) => {
      if (cancelled) return;
      revoke();
      objectUrlRef.current = URL.createObjectURL(new Blob([data]));
      setResolved({ url: objectUrlRef.current, fromCache });
    };

    (async () => {
      const cached = await getSplineScene(sourceUrl);
      if (cached) {
        applyBlob(cached.data, true);
        void refreshSplineScene(sourceUrl, cached);
        return;
      }

      const fetched = await fetchSplineScene(sourceUrl);
      if (fetched) {
        applyBlob(fetched.data, false);
        void putSplineScene(sourceUrl, fetched.data, fetched);
        return;
      }

      if (!cancelled) setResolved({ url: sourceUrl, fromCache: false });
    })();

    return () => {
      cancelled = true;
      revoke();
    };
  }, [sourceUrl]);

  return resolved;
}
