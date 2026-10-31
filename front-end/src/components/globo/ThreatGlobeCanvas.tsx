"use client";

import { useEffect, useRef, useState } from "react";
import { DottedMap } from "@wescld/dotted-map";

export type GlobePoint = {
  lat: number;
  lng: number;
  size: number;
  color: string;
  country_code: string;
  country_name: string;
  risk_score: number;
};

type Props = {
  points: GlobePoint[];
  selectedCode: string | null;
};

/**
 * Fallback Canvas 2D para o globo — usa @wescld/dotted-map quando WebGL/WebGPU não disponível.
 * Renderiza globo ortográfico em Canvas 2D puro (sem Three.js).
 */
export function ThreatGlobeCanvas({ points, selectedCode }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ReturnType<typeof DottedMap> | null>(null);
  const [size, setSize] = useState({ w: 800, h: 520 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const sync = () => setSize({ w: el.clientWidth || 800, h: el.clientHeight || 520 });
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Criar instância do mapa
    const map = DottedMap({
      globe: {
        size: size.w * 0.6,
        color: "#1e3a5f",
        dots: 0.7,
      },
      background: {
        color: "#0a0c10",
      },
      line: {
        color: "#e2b857",
        width: 0.5,
      },
    });

    // DottedMap retorna uma função para destruir
    const destroy = map(containerRef.current);

    mapRef.current = destroy;

    // Adicionar pontos (países com risco)
    const mapPoints = points.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      size: p.size * 10,
      color: p.color,
      data: p,
    }));

    if (mapPoints.length > 0) {
      map.addMarkers(mapPoints);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current();
        mapRef.current = null;
      }
    };
  }, [points, size]);

  // Rotacionar para país selecionado
  useEffect(() => {
    if (!mapRef.current || !selectedCode) return;

    const p = points.find((x) => x.country_code === selectedCode);
    if (!p) return;

    // DottedMap não tem API direta para rotation, então é uma limitação
    // Em uma implementação completa, você precisaria usar uma biblioteca com mais controle
    // ou customizar a projeção ortográfica manualmente
  }, [selectedCode, points]);

  return (
    <div
      ref={containerRef}
      className="relative h-[min(70vh,640px)] w-full overflow-hidden rounded-lg border border-ink-700/50 bg-gradient-to-b from-ink-950 via-[#0a1628] to-ink-950"
    >
      <div className="pointer-events-none absolute bottom-3 left-3 flex gap-3 text-[10px] uppercase tracking-wider text-slate-400">
        <span className="flex items-center gap-1">
          <i className="inline-block h-2 w-2 rounded-full bg-emerald-400" /> Baixo
        </span>
        <span className="flex items-center gap-1">
          <i className="inline-block h-2 w-2 rounded-full bg-amber-400" /> Médio
        </span>
        <span className="flex items-center gap-1">
          <i className="inline-block h-2 w-2 rounded-full bg-red-400" /> Alto
        </span>
      </div>
      <div className="pointer-events-none absolute top-3 right-3 rounded border border-ink-700/50 bg-ink-950/80 px-2 py-1 text-[10px] text-slate-500">
        Modo Canvas 2D
      </div>
    </div>
  );
}
