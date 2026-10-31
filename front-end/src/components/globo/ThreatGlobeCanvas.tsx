"use client";

import { useEffect, useState } from "react";
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
  const [size, setSize] = useState({ w: 800, h: 520 });

  useEffect(() => {
    const sync = () => setSize({ w: window.innerWidth * 0.8 || 800, h: 520 });
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, []);

  // Converter pontos para o formato esperado pelo DottedMap
  const markers = points.map((p) => ({
    id: p.country_code,
    latitude: p.lat,
    longitude: p.lng,
    data: p,
  }));

  // Rotacionar para país selecionado
  // DottedMap não tem API direta para rotation, então é uma limitação
  // Em uma implementação completa, você precisaria usar uma biblioteca com mais controle
  // ou customizar a projeção ortográfica manualmente

  return (
    <div className="relative h-[min(70vh,640px)] w-full overflow-hidden rounded-lg border border-ink-700/50 bg-gradient-to-b from-ink-950 via-[#0a1628] to-ink-950">
      <DottedMap
        markers={markers}
        defaultViewMode="globe"
        darkMode={true}
        theme={{
          dotColor: "#e2b857",
          globeFill: "#1e3a5f",
          outlineColor: "#1e3a5f",
        }}
        initialZoom={1.5}
        zoomRange={[1, 4]}
        className="h-full w-full"
      />
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
