import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RankingTable } from "@/components/dashboard/RankingTable";
import { MOCK_RESULTADO } from "@/lib/mock";
import { RANKING_TENDENCIAS } from "./fixtures";

describe("RankingTable", () => {
  it("renderiza candidatos do ranking Top-10", () => {
    render(
      <RankingTable
        title="Besta do Mar"
        subtitle="Top 10"
        items={MOCK_RESULTADO.ranking_mar}
      />,
    );
    expect(screen.getByText("Besta do Mar")).toBeInTheDocument();
    expect(screen.getByText("Coalizão de Mediação Global")).toBeInTheDocument();
    expect(screen.getByText("72.1%")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(11);
  });

  it("mostra ícones de tendência 24h (alta, baixa, estável)", () => {
    render(<RankingTable title="Tendências" subtitle="PAP" items={RANKING_TENDENCIAS} />);
    expect(screen.getByText(/▲ \+2\.5%/)).toBeInTheDocument();
    expect(screen.getByText(/▼ -1\.2%/)).toBeInTheDocument();
    expect(screen.getByText("▬ Estável")).toBeInTheDocument();
  });

  it("exibe posição, PAP e fator principal", () => {
    render(<RankingTable title="Detalhes" subtitle="-" items={RANKING_TENDENCIAS.slice(0, 1)} />);
    expect(screen.getByText("1º")).toBeInTheDocument();
    expect(screen.getByText("Candidato Alta")).toBeInTheDocument();
    expect(screen.getByText("70.0%")).toBeInTheDocument();
    expect(screen.getByText("Destaque em carisma_global")).toBeInTheDocument();
  });

  it("mostra mensagem quando lista vazia", () => {
    render(<RankingTable title="Vazio" subtitle="-" items={[]} />);
    expect(screen.getByText("Nenhum candidato ranqueado")).toBeInTheDocument();
  });
});
