import { prisma } from "@/lib/prisma";
import type { CenarioSimulacao } from "@/lib/types";

export type GrafoNode = {
  id: string;
  label: string;
  tipo: string;
  peso_gnn?: number;
  attrs?: Record<string, unknown>;
};

export type GrafoEdge = {
  source: string;
  target: string;
  relacao: string;
};

function nodeLabel(attrs: Record<string, unknown>, id: string): string {
  const label = attrs.nome ?? attrs.label ?? attrs.titulo ?? attrs.ref;
  return typeof label === "string" ? label : id;
}

export async function getGrafoFromDb(): Promise<{
  nodes: GrafoNode[];
  edges: GrafoEdge[];
  gnn_convergence: number;
}> {
  const [nodes, edges] = await Promise.all([
    prisma.grafoNo.findMany({ take: 500 }),
    prisma.grafoAresta.findMany({ take: 2000 }),
  ]);

  if (nodes.length === 0) {
    return { nodes: defaultNodes(), edges: defaultEdges(), gnn_convergence: 0.42 };
  }

  const mappedNodes: GrafoNode[] = nodes.map((n) => {
    const attrs = (n.attrs as Record<string, unknown>) || {};
    return {
      id: n.nodeId,
      label: nodeLabel(attrs, n.nodeId),
      tipo: n.tipo,
      attrs,
    };
  });

  const mappedEdges: GrafoEdge[] = edges.map((e) => ({
    source: e.sourceId,
    target: e.targetId,
    relacao: e.relacao,
  }));

  const profeciaCount = mappedNodes.filter((n) => n.tipo === "profecia").length;
  const gnn_convergence = Math.min(1, profeciaCount / Math.max(1, mappedNodes.length) + 0.2);

  return { nodes: mappedNodes, edges: mappedEdges, gnn_convergence };
}

export async function getCenariosFromDb(): Promise<CenarioSimulacao[]> {
  const { nodes, edges } = await getGrafoFromDb();
  const precond: Record<string, string[]> = {};
  const depend: Record<string, string[]> = {};

  for (const e of edges) {
    if (["precondicao", "antecede", "sinaliza"].includes(e.relacao)) {
      precond[e.target] = [...(precond[e.target] || []), e.source];
    }
    if (["dependencia", "cumpre", "cumpre_parcial", "influencia"].includes(e.relacao)) {
      depend[e.target] = [...(depend[e.target] || []), e.source];
    }
  }

  const cenarios = nodes
    .filter((n) => ["cenario", "evento", "profecia"].includes(n.tipo))
    .map((n) => {
      const attrs = n.attrs || {};
      return {
        id: n.id,
        titulo: n.label,
        descricao: String(attrs.descricao ?? ""),
        precondicoes: precond[n.id] || [],
        dependencias: depend[n.id] || [],
        fase_alvo: (attrs.fase_alvo as CenarioSimulacao["fase_alvo"]) || "FASE_II",
        impacto_indice: Number(attrs.impacto_indice ?? 0.08),
      };
    });

  return cenarios.length > 0 ? cenarios : defaultCenarios();
}

function defaultNodes(): GrafoNode[] {
  return [
    { id: "evt_oriente_medio", label: "Tensão Oriente Médio", tipo: "evento" },
    { id: "evt_cbdc", label: "Expansão CBDC", tipo: "evento" },
    { id: "prof_ap12", label: "Ap 12–13", tipo: "profecia" },
    { id: "lider_global", label: "Líder Global", tipo: "figura" },
  ];
}

function defaultEdges(): GrafoEdge[] {
  return [
    { source: "evt_oriente_medio", target: "prof_ap12", relacao: "sinaliza" },
    { source: "evt_cbdc", target: "prof_ap12", relacao: "cumpre_parcial" },
    { source: "lider_global", target: "evt_oriente_medio", relacao: "influencia" },
  ];
}

function defaultCenarios(): CenarioSimulacao[] {
  return [
    {
      id: "prof_ap12",
      titulo: "Convergência Ap 12–13",
      descricao: "Padrão profético de controle e adoração.",
      precondicoes: ["evt_cbdc", "evt_oriente_medio"],
      dependencias: ["evt_cbdc"],
      fase_alvo: "FASE_III",
      impacto_indice: 0.15,
    },
  ];
}
