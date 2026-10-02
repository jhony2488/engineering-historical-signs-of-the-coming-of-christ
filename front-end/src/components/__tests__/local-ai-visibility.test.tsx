import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LocalAiState } from "@/lib/local-ai/engine";

let mockState: LocalAiState = {
  status: "unsupported",
  tier: null,
  modelLabel: null,
  progressPct: null,
  downloadingFile: null,
  approxBytes: null,
  autoDownloadBlocked: false,
  persisted: false,
  error: null,
};

vi.mock("@/hooks/useLocalAI", () => ({
  useLocalAI: () => ({ ...mockState, enableLocalAi: vi.fn() }),
  startLocalAiEngine: vi.fn(),
}));

vi.mock("@/hooks/useLocalSummary", () => ({
  useLocalSummary: () => ({
    text: null,
    generating: false,
    error: null,
    fromCache: false,
    generate: vi.fn(),
  }),
}));

import { CandidateExplainButton } from "@/components/local-ai/CandidateExplainButton";
import { DownloadStatusChip } from "@/components/local-ai/DownloadStatusChip";
import { LocalSummaryCard } from "@/components/local-ai/LocalSummaryCard";
import type { RankingCandidato, ResultadoEscatologico } from "@/lib/types";

const CANDIDATO = {
  posicao: 1,
  candidato_id: "c1",
  nome: "Candidato X",
  personagem: "besta_mar",
  probabilidade_atual: 20,
  tendencia_24h: 0,
  fator_principal: "fator",
} as RankingCandidato;

const RESULTADO = {
  data_referencia: "2026-10-02",
  fase_atual: "FASE_I",
  indice_global: 0.3,
  confianca: 0.9,
  ranking_mar: [],
  ranking_terra: [],
  eventos_analisados: [],
} as unknown as ResultadoEscatologico;

function setStatus(status: LocalAiState["status"]) {
  mockState = { ...mockState, status };
}

describe("visibilidade da IA on-device", () => {
  beforeEach(() => setStatus("unsupported"));

  it("unsupported → nenhum componente renderiza", () => {
    const { container: a } = render(<LocalSummaryCard resultado={RESULTADO} />);
    const { container: b } = render(<CandidateExplainButton candidato={CANDIDATO} />);
    const { container: c } = render(<DownloadStatusChip />);
    expect(a).toBeEmptyDOMElement();
    expect(b).toBeEmptyDOMElement();
    expect(c).toBeEmptyDOMElement();
  });

  it("downloading → card não aparece, chip mostra progresso neutro", () => {
    setStatus("downloading");
    mockState.progressPct = 42;
    const { container } = render(<LocalSummaryCard resultado={RESULTADO} />);
    expect(container).toBeEmptyDOMElement();
    const chip = render(<DownloadStatusChip />);
    expect(chip.getByRole("status").textContent).toContain("42%");
    expect(chip.getByRole("status").textContent).not.toMatch(/local|navegador|dispositivo/i);
  });

  it("opt_in_required → card neutro com CTA Ativar", () => {
    setStatus("opt_in_required");
    const chip = render(<DownloadStatusChip />);
    expect(chip.getByRole("dialog").textContent).not.toMatch(/IA local|navegador/i);
    expect(chip.getByRole("button").textContent).toBe("Ativar");
  });
});
