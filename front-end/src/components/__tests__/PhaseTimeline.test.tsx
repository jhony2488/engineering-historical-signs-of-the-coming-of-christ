import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PhaseTimeline } from "@/components/dashboard/PhaseTimeline";
import { TRANSICAO_ATIVA } from "./fixtures";

describe("PhaseTimeline", () => {
  it("destaca fase ativa em modo estável", () => {
    render(
      <PhaseTimeline
        faseAtual="FASE_II"
        probabilidade={0.62}
        distribuicaoHmm={{ FASE_II: 0.41 }}
        faseScores={{ FASE_II: 0.42 }}
      />,
    );
    expect(screen.getByText(/Fase ativa:/)).toHaveTextContent("A Grande Apostasia");
    expect(screen.getByText(/62\.0% de convicção/)).toBeInTheDocument();
    expect(screen.getByText(/Score:/)).toHaveTextContent("42%");
    expect(screen.getByText(/HMM:/)).toHaveTextContent("41%");
  });

  it("exibe modo transição com fases dominante e secundária", () => {
    render(
      <PhaseTimeline
        faseAtual="FASE_II"
        probabilidade={0.62}
        transicao={TRANSICAO_ATIVA}
        faseScores={{ FASE_II: 0.42, FASE_III: 0.38 }}
      />,
    );
    expect(screen.getByText(/Transição ativa/)).toBeInTheDocument();
    expect(screen.getByText(/margem de 2\.0%/)).toBeInTheDocument();
    expect(screen.getByText(/dominante/)).toBeInTheDocument();
    expect(screen.getByText(/próxima/)).toBeInTheDocument();
  });

  it("renderiza as quatro fases da linha do tempo", () => {
    render(<PhaseTimeline faseAtual="FASE_I" probabilidade={0.4} />);
    expect(screen.getByRole("heading", { name: "O Início das Dores" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "A Grande Apostasia" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Manifestação e Tribulação" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Convergência Final" })).toBeInTheDocument();
  });
});
