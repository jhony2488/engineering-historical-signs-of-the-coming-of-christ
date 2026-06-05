import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { MOCK_RESULTADO } from "@/lib/mock";
import { generateMockHistorico } from "@/lib/mock";

const fetchResultadoAtualSWR = vi.fn();
const fetchResultadoAtual = vi.fn();
const fetchHistorico = vi.fn();
const fetchRankingSWR = vi.fn();
const fetchRanking = vi.fn();
const fetchBaselineHistoricoSWR = vi.fn();
const fetchBaselineAtualizacoesSWR = vi.fn();
const getDataSource = vi.fn(() => "db" as const);

vi.mock("@/components/charts/ConvictionChart", () => ({
  ConvictionChart: () => <div data-testid="conviction-chart" />,
}));

vi.mock("@/lib/api", () => ({
  fetchResultadoAtualSWR: (...args: unknown[]) => fetchResultadoAtualSWR(...args),
  fetchResultadoAtual: (...args: unknown[]) => fetchResultadoAtual(...args),
  fetchHistorico: (...args: unknown[]) => fetchHistorico(...args),
  fetchRankingSWR: (...args: unknown[]) => fetchRankingSWR(...args),
  fetchRanking: (...args: unknown[]) => fetchRanking(...args),
  fetchBaselineHistoricoSWR: (...args: unknown[]) => fetchBaselineHistoricoSWR(...args),
  fetchBaselineAtualizacoesSWR: (...args: unknown[]) => fetchBaselineAtualizacoesSWR(...args),
  getDataSource: () => getDataSource(),
}));

describe("DashboardClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchResultadoAtualSWR.mockResolvedValue({
      data: MOCK_RESULTADO,
      fromCache: false,
      isMock: true,
      source: "db",
    });
    fetchResultadoAtual.mockResolvedValue({
      data: MOCK_RESULTADO,
      fromCache: false,
      isMock: true,
      source: "db",
    });
    fetchHistorico.mockResolvedValue({
      data: generateMockHistorico(7),
      fromCache: false,
      isMock: true,
      source: "db",
    });
    fetchRankingSWR.mockImplementation((personagem: string) =>
      Promise.resolve({
        data:
          personagem === "besta_mar"
            ? MOCK_RESULTADO.ranking_mar
            : MOCK_RESULTADO.ranking_terra,
        fromCache: false,
        isMock: true,
        source: "db",
      }),
    );
    fetchRanking.mockImplementation((personagem: string) =>
      Promise.resolve({
        data:
          personagem === "besta_mar"
            ? MOCK_RESULTADO.ranking_mar
            : MOCK_RESULTADO.ranking_terra,
        fromCache: false,
        isMock: true,
        source: "db",
      }),
    );
    fetchBaselineHistoricoSWR.mockResolvedValue({
      data: null,
      fromCache: false,
      isMock: false,
      source: "db",
    });
    fetchBaselineAtualizacoesSWR.mockResolvedValue({
      data: [],
      fromCache: false,
      isMock: false,
      source: "db",
    });
  });

  it("shows loading then panel with mock data", async () => {
    render(<DashboardClient />);
    await waitFor(() => {
      expect(screen.getByText("Monitor Escatológico")).toBeInTheDocument();
    });
    expect(screen.getByText(/Medidor de Proximidade Espiritual/)).toBeInTheDocument();
    expect(screen.getByText("Coalizão de Mediação Global")).toBeInTheDocument();
  });

  it("shows transition alert when result has transicao_fase", async () => {
    render(<DashboardClient />);
    await waitFor(() => {
      expect(screen.getByText("Zona de Transição entre Fases")).toBeInTheDocument();
    });
  });

  it("revalidates data when clicking Refresh", async () => {
    render(<DashboardClient />);
    await waitFor(() => screen.getByText("Atualizar dados"));

    fireEvent.click(screen.getByText("Atualizar dados"));

    await waitFor(() => {
      expect(fetchResultadoAtual).toHaveBeenCalledWith({ skipCache: true });
      expect(fetchHistorico).toHaveBeenCalledWith(undefined, 30, { skipCache: true });
    });
  });

  it("shows empty state when there is no result", async () => {
    fetchResultadoAtualSWR.mockResolvedValueOnce({
      data: null as unknown as typeof MOCK_RESULTADO,
      fromCache: false,
      isMock: false,
      source: "db",
    });
    fetchHistorico.mockResolvedValueOnce({ data: [], fromCache: false, isMock: false, source: "db" });

    render(<DashboardClient />);
    await waitFor(() => {
      expect(screen.getByText(/Nenhum resultado disponível/)).toBeInTheDocument();
    });
  });

  it("revalidates in background when SWR returns stale cache", async () => {
    fetchResultadoAtualSWR.mockResolvedValueOnce({
      data: MOCK_RESULTADO,
      fromCache: true,
      isMock: false,
      source: "db",
      revalidating: true,
    });

    render(<DashboardClient />);

    await waitFor(() => {
      expect(fetchResultadoAtual).toHaveBeenCalledWith({ skipCache: true });
    });
  });
});
