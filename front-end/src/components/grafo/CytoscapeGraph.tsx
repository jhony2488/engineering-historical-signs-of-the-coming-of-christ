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
              color: "#94a3b8",
              "background-color": "#1e293b",
              "border-width": 2,
              "border-color": "#475569",
              width: 36,
              height: 36,
            },
          },
          {
            selector: "node[grupo = 'cenario']",
            style: {
              label: "data(label)",
              "text-valign": "center",
              "font-size": 9,
              color: "#e2e8f0",
              "background-color": "#312e81",
              "border-width": 2,
              "border-color": "#6366f1",
              shape: "round-rectangle",
              width: 80,
              height: 40,
            },
          },
          {
            selector: "node[ativo = true]",
            style: {
              "border-color": "#fbbf24",
              "background-color": "#422006",
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
            },
          },
        ],
        layout: { name: "breadthfirst", directed: true, padding: 24, spacingFactor: 1.2 },
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
      aria-label="Grafo de cenários escatológicos"
    />
  );
}
