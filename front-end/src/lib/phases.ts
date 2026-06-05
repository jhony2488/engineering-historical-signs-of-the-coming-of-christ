import type { FaseId } from "./types";

export interface FaseInfo {
  id: FaseId;
  index: number;
  titulo: string;
  subtitulo: string;
  descricao: string;
}

export const FASES: FaseInfo[] = [
  {
    id: "FASE_I",
    index: 1,
    titulo: "O Início das Dores",
    subtitulo: "Eventos preparatórios",
    descricao:
      "Guerras, fomes, terremotos e pestes em ciclos crescentes — primeiros marcadores de transição.",
  },
  {
    id: "FASE_II",
    index: 2,
    titulo: "A Grande Apostasia",
    subtitulo: "Cenário global",
    descricao:
      "Governança global, esfriamento da fé, tecnologia disruptiva e preparação geopolítica.",
  },
  {
    id: "FASE_III",
    index: 3,
    titulo: "Manifestação e Tribulação",
    subtitulo: "Eventos futuros",
    descricao:
      "Figuras antitéticas ao messianismo, perseguição sistemática e polarização extrema.",
  },
  {
    id: "FASE_IV",
    index: 4,
    titulo: "Convergência Final",
    subtitulo: "Iminência",
    descricao:
      "Sinais cósmicos definitivos, cumprimento das últimas profecias e transição à Parusia.",
  },
];

export function getFase(id: FaseId): FaseInfo {
  return FASES.find((f) => f.id === id) ?? FASES[0];
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}
