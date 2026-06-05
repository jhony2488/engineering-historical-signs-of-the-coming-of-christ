import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useGrafoData } from "@/hooks/useGrafoData";
import { MOCK_CENARIOS, MOCK_NOS_GRAFO } from "@/lib/mock-cenarios";

const fetchGrafo = vi.fn();
const fetchCenarios = vi.fn();

vi.mock("@/lib/grafo-api", () => ({
  fetchGrafo: (...args: unknown[]) => fetchGrafo(...args),
  fetchCenarios: (...args: unknown[]) => fetchCenarios(...args),
}));

const GRAFO_DB = {
  nodes: [{ id: "n1", label: "Nó DB", tipo: "macro" }],
  edges: [{ source: "n1", target: "n2", relacao: "precondicao" }],
  gnn_convergence: 0.77,
};

const CENARIOS_DB = [MOCK_CENARIOS[0]];

describe("useGrafoData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inicia em loading com dados mock como fallback", () => {
    fetchGrafo.mockReturnValue(new Promise(() => undefined));
    fetchCenarios.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() => useGrafoData());

    expect(result.current.loading).toBe(true);
    expect(result.current.nos).toEqual(MOCK_NOS_GRAFO);
    expect(result.current.cenarios).toEqual(MOCK_CENARIOS);
    expect(result.current.fromDb).toBe(false);
  });

  it("carrega grafo e cenários do banco com sucesso", async () => {
    fetchGrafo.mockResolvedValue(GRAFO_DB);
    fetchCenarios.mockResolvedValue(CENARIOS_DB);

    const { result } = renderHook(() => useGrafoData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.fromDb).toBe(true);
    expect(result.current.nos).toEqual(GRAFO_DB.nodes);
    expect(result.current.cenarios).toEqual(CENARIOS_DB);
    expect(result.current.arestas).toEqual([
      { source: "n1", target: "n2", relacao: "precondicao" },
    ]);
    expect(result.current.gnnConvergence).toBe(0.77);
  });

  it("usa fallback mock quando API falha", async () => {
    fetchGrafo.mockRejectedValue(new Error("grafo 500"));
    fetchCenarios.mockRejectedValue(new Error("cenarios 500"));

    const { result } = renderHook(() => useGrafoData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.fromDb).toBe(false);
    expect(result.current.nos).toEqual(MOCK_NOS_GRAFO);
    expect(result.current.cenarios).toEqual(MOCK_CENARIOS);
    expect(result.current.arestas.length).toBeGreaterThan(0);
    expect(result.current.gnnConvergence).toBeUndefined();
  });
});
