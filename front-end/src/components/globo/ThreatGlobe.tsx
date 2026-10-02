"use client";

import { useEffect, useRef, useState } from "react";
import Globe from "react-globe.gl";

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
  onSelectCountry: (code: string) => void;
};

export function ThreatGlobe({ points, selectedCode, onSelectCountry }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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
    const g = globeRef.current;
    if (!g || !selectedCode) return;
    const p = points.find((x) => x.country_code === selectedCode);
    if (!p) return;
    g.pointOfView({ lat: p.lat, lng: p.lng, altitude: 1.6 }, 1000);
  }, [selectedCode, points]);

  return (
    <div
      ref={containerRef}
      className="relative h-[min(70vh,640px)] w-full overflow-hidden rounded-lg border border-ink-700/50 bg-gradient-to-b from-ink-950 via-[#0a1628] to-ink-950"
    >
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        pointsData={points}
        pointAltitude="size"
        pointRadius={0.55}
        pointColor="color"
        pointLabel={(d: object) => {
          const p = d as GlobePoint;
          return `<div style="padding:4px 8px"><b>${p.country_name}</b><br/>Risco ${(p.risk_score * 100).toFixed(0)}%</div>`;
        }}
        onPointClick={(d: object) => {
          const p = d as GlobePoint;
          onSelectCountry(p.country_code);
        }}
        atmosphereColor="#1e3a5f"
        atmosphereAltitude={0.18}
        width={size.w}
        height={size.h}
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
    </div>
  );
}
