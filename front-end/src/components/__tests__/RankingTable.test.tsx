import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RankingTable } from "@/components/dashboard/RankingTable";
import { MOCK_RESULTADO } from "@/lib/mock";
import { RANKING_TENDENCIAS } from "./fixtures";

describe("RankingTable", () => {
  it("renders Top-10 ranking candidates", () => {
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

  it("shows 24h trend icons (up, down, stable)", () => {
    render(<RankingTable title="Tendências" subtitle="PAP" items={RANKING_TENDENCIAS} />);
    expect(screen.getByText(/\+2\.5%/)).toBeInTheDocument();
    expect(screen.getByText(/-1\.2%/)).toBeInTheDocument();
    expect(screen.getByText("Estável")).toBeInTheDocument();
    expect(screen.getByText("Tendência de alta")).toBeInTheDocument();
    expect(screen.getByText("Tendência de queda")).toBeInTheDocument();
  });

  it("shows position, PAP and main factor", () => {
    render(<RankingTable title="Detalhes" subtitle="-" items={RANKING_TENDENCIAS.slice(0, 1)} />);
    expect(screen.getByText("1º")).toBeInTheDocument();
    expect(screen.getByText("Candidato Alta")).toBeInTheDocument();
    expect(screen.getByText("70.0%")).toBeInTheDocument();
    expect(screen.getByText("Destaque em carisma_global")).toBeInTheDocument();
  });

  it("shows message when list is empty", () => {
    render(<RankingTable title="Vazio" subtitle="-" items={[]} />);
    expect(screen.getByText("Nenhum candidato ranqueado")).toBeInTheDocument();
  });
});
