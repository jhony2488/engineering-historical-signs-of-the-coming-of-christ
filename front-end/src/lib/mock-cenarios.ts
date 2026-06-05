import type { CenarioSimulacao } from "./types";

export const MOCK_CENARIOS: CenarioSimulacao[] = [
  {
    id: "evt-cbdc-obrigatoria",
    titulo: "CBDC obrigatória em bloco continental",
    descricao:
      "Adoção mandatória de moeda digital de banco central com exclusão de alternativas em escala regional.",
    precondicoes: ["macro-cbdc", "macro-centralizacao"],
    dependencias: ["macro-cbdc"],
    fase_alvo: "FASE_III",
    impacto_indice: 0.12,
  },
  {
    id: "evt-paz-falsa",
    titulo: "Tratado de paz multilateral no Oriente Médio",
    descricao: "Acordo de mediação global com reconhecimento unânime e narrativa messiânica secular.",
    precondicoes: ["macro-conflito-om", "macro-diplomacia"],
    dependencias: ["macro-conflito-om"],
    fase_alvo: "FASE_II",
    impacto_indice: 0.09,
  },
  {
    id: "evt-narrativa-unificada",
    titulo: "Plataforma única de verificação de conteúdo",
    descricao: "Consolidação de gatekeepers digitais com validação obrigatória do líder global.",
    precondicoes: ["micro-vigilancia", "macro-ia"],
    dependencias: ["evt-cbdc-obrigatoria"],
    fase_alvo: "FASE_III",
    impacto_indice: 0.15,
  },
  {
    id: "evt-prodigio-tecnologico",
    titulo: "Demonstração pública de IA oracular",
    descricao: "Sistema de IA apresentado como fonte de revelação e orientação moral universal.",
    precondicoes: ["macro-ia", "micro-despertamento"],
    dependencias: ["evt-narrativa-unificada"],
    fase_alvo: "FASE_III",
    impacto_indice: 0.11,
  },
  {
    id: "evt-apostasia-acelerada",
    titulo: "Ruptura institucional em denominações majoritárias",
    descricao: "Abandono visível de doutrina histórica em favor de síntese inter-religiosa.",
    precondicoes: ["micro-apostasia"],
    dependencias: [],
    fase_alvo: "FASE_I",
    impacto_indice: 0.07,
  },
];

export type GrafoAresta = { source: string; target: string; relacao: "precondicao" | "dependencia" };

export function buildGrafoArestas(): GrafoAresta[] {
  const edges: GrafoAresta[] = [];
  for (const c of MOCK_CENARIOS) {
    for (const p of c.precondicoes) {
      edges.push({ source: p, target: c.id, relacao: "precondicao" });
    }
    for (const d of c.dependencias) {
      edges.push({ source: d, target: c.id, relacao: "dependencia" });
    }
  }
  return edges;
}

export const MOCK_NOS_GRAFO: { id: string; label: string; tipo: string }[] = [
  { id: "macro-cbdc", label: "Expansão CBDC", tipo: "macro" },
  { id: "macro-conflito-om", label: "Tensão Oriente Médio", tipo: "macro" },
  { id: "macro-centralizacao", label: "Centralização estrutural", tipo: "macro" },
  { id: "macro-diplomacia", label: "Diplomacia multilateral", tipo: "macro" },
  { id: "macro-ia", label: "IA generativa global", tipo: "macro" },
  { id: "micro-vigilancia", label: "Vigilância digital", tipo: "micro" },
  { id: "micro-despertamento", label: "Despertamento local", tipo: "micro" },
  { id: "micro-apostasia", label: "Apostasia institucional", tipo: "micro" },
];
