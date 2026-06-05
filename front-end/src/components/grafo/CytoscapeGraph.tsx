"use client";

import { useEffect, useRef } from "react";
import type { GrafoAresta } from "@/lib/mock-cenarios";

type GrafoNo = { id: string; label: string; tipo: string };
type CenarioNo = { id: string; titulo: string };

interface CytoscapeGraphProps {
  nos: GrafoNo[];
  cenarios: CenarioNo[];
  arestas: GrafoAresta[];
  ativos: Set<string>;
  height?: number;
}

export function CytoscapeGraph({
  nos,
  cenarios,
  arestas,
  ativos,
  height = 420,
}: CytoscapeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cy: { destroy(): void } | null = null;
    let cancelled = false;

    async function init() {
      const cytoscape = (await import("cytoscape")).default;
      if (cancelled || !containerRef.current) return;

      const elements = [
        ...nos.map((n) => ({
          data: {
            id: n.id,
            label: n.label,
            tipo: n.tipo,
            grupo: "no",
            ativo: ativos.has(n.id),
          },
        })),
        ...cenarios.map((c) => ({
          data: {
            id: c.id,
            label: c.titulo,
            tipo: "cenario",
            grupo: "cenario",
            ativo: ativos.has(c.id),
          },
        })),
        ...arestas.map((a, i) => ({
          data: {
            id: `e-${i}`,
            source: a.source,
            target: a.target,
            relacao: a.relacao,
          },
        })),
      ];

      cy = cytoscape({
        container: containerRef.current,
        elements,
        style: [
          {
            selector: "node[grupo = 'no']",
            style: {
              label: "data(label)",
              "text-valign": "bottom",
              "text-margin-y": 6,
              "font-size": 10,
              "font-family": "Segoe UI, system-ui, sans-serif",
              color: "#cbd5e1",
              "text-outline-color": "#020617",
              "text-outline-width": 2,
              "background-color": "#0f172a",
              "border-width": 2,
              "border-color": "#475569",
              width: 38,
              height: 38,
              "shadow-blur": 16,
              "shadow-color": "#60a5fa",
              "shadow-opacity": 0.26,
              "shadow-offset-x": 0,
              "shadow-offset-y": 0,
            },
          },
          {
            selector: "node[grupo = 'cenario']",
            style: {
              label: "data(label)",
              "text-valign": "center",
              "font-size": 9,
              color: "#f8fafc",
              "text-wrap": "wrap",
              "text-max-width": 92,
              "background-color": "#1e1b4b",
              "border-width": 2,
              "border-color": "#818cf8",
              shape: "round-rectangle",
              width: 88,
              height: 40,
              "shadow-blur": 18,
              "shadow-color": "#a78bfa",
              "shadow-opacity": 0.3,
              "shadow-offset-x": 0,
              "shadow-offset-y": 0,
            },
          },
          {
            selector: "node[ativo = true]",
            style: {
              "border-color": "#fbbf24",
              "background-color": "#3f1d0f",
              "border-width": 3,
              "shadow-color": "#fbbf24",
              "shadow-opacity": 0.45,
            },
          },
          {
            selector: "node:hover",
            style: {
              "border-color": "#f8fafc",
              "shadow-opacity": 0.55,
              "shadow-blur": 22,
            },
          },
          {
            selector: "edge[relacao = 'precondicao']",
            style: {
              width: 2,
              "line-color": "#64748b",
              "target-arrow-color": "#64748b",
              "target-arrow-shape": "triangle",
              "curve-style": "bezier",
              "line-cap": "round",
              opacity: 0.92,
            },
          },
          {
            selector: "edge[relacao = 'dependencia']",
            style: {
              width: 2,
              "line-color": "#a78bfa",
              "target-arrow-color": "#a78bfa",
              "target-arrow-shape": "vee",
              "curve-style": "bezier",
              "line-style": "dashed",
              "line-dash-pattern": [8, 6],
              "line-cap": "round",
              opacity: 0.92,
            },
          },
          {
            selector: "edge:hover",
            style: {
              width: 3,
              opacity: 1,
              "line-color": "#e2e8f0",
              "target-arrow-color": "#e2e8f0",
            },
          },
        ],
        layout: { name: "breadthfirst", directed: true, padding: 32, spacingFactor: 1.35 },
        minZoom: 0.4,
        maxZoom: 2.5,
      });
    }

    init().catch(() => undefined);

    return () => {
      cancelled = true;
      cy?.destroy();
    };
  }, [nos, cenarios, arestas, ativos]);

  return (
    <div
      ref={containerRef}
      className="graph-frame w-full"
      style={{ height }}
      role="application"
      aria-label="Grafo interativo de cenários escatológicos. Use o mouse ou toque para explorar nós e dependências."
      tabIndex={0}
    />
  );
}
