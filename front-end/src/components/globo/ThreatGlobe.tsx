"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Globe, { GlobeMethods } from "react-globe.gl";

const ThreatGlobeCanvas = dynamic(
  () => import("./ThreatGlobeCanvas").then((m) => m.ThreatGlobeCanvas),
  {
    ssr: false,
  },
);

const ThreatGlobeWasm = dynamic(
  () => import("./ThreatGlobeWasm").then((m) => m.ThreatGlobeWasm),
  {
    ssr: false,
  },
);

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

// Define o navigator com a propriedade gpu sem depender do tipo global GPU
interface NavigatorWithGPU {
  gpu?: {
    requestAdapter: (options?: unknown) => Promise<unknown>;
  };
}

export function ThreatGlobe({ points, selectedCode, onSelectCountry }: Props) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 520 });
  const [rendererType, setRendererType] = useState<"webgpu" | "webgl" | "wasm" | "canvas" | null>(null);

  useEffect(() => {
    // Detectar suporte a WebGPU, WebGL, WebAssembly e Canvas 2D
    const checkRendererSupport = async () => {
      // 1. WebGPU
      if ("gpu" in navigator) {
        try {
          const adapter = await (navigator as unknown as NavigatorWithGPU).gpu?.requestAdapter();
          if (adapter) {
            setRendererType("webgpu");
            return;
          }
        } catch {
          // WebGPU não disponível, tentar WebGL
        }
      }

      // 2. WebGL/WebGL2
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl");
      if (gl) {
        setRendererType("webgl");
        return;
      }

      // 3. WebAssembly support
      try {
        if (typeof WebAssembly === "object" && typeof WebAssembly.instantiate === "function") {
          // Test basic WASM support
          const testModule = new WebAssembly.Module(
            Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00),
          );
          if (testModule instanceof WebAssembly.Module) {
            setRendererType("wasm");
            return;
          }
        }
      } catch {
        // WebAssembly não disponível, usar Canvas 2D
      }

      // 4. Fallback para Canvas 2D
      setRendererType("canvas");
    };

    checkRendererSupport();
  }, []);

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

  // Loading state
  if (rendererType === null) {
    return (
      <div className="flex h-[min(70vh,640px)] items-center justify-center rounded-lg border border-ink-700/50 bg-ink-950/40">
        <p className="text-sm text-slate-500">Verificando suporte a WebGPU/WebGL/WebAssembly…</p>
      </div>
    );
  }

  // Fallback Canvas 2D quando WebGL/WebAssembly não disponível
  if (rendererType === "canvas") {
    return <ThreatGlobeCanvas points={points} selectedCode={selectedCode} />;
  }

  // WebAssembly fallback quando WebGL não disponível mas WASM sim
  if (rendererType === "wasm") {
    return <ThreatGlobeWasm points={points} selectedCode={selectedCode} onSelectCountry={onSelectCountry} />;
  }

  // WebGL/WebGL2 ou WebGPU disponível - usar react-globe.gl
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
