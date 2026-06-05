import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PhaseTransitionAlert } from "@/components/dashboard/PhaseTransitionAlert";
import { TRANSICAO_ATIVA } from "./fixtures";

describe("PhaseTransitionAlert", () => {
  it("does not render when transicao_entre_fases is false", () => {
    const { container } = render(
      <PhaseTransitionAlert
        transicao={{ ...TRANSICAO_ATIVA, transicao_entre_fases: false }}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders adjacent phase titles and scores", () => {
    render(<PhaseTransitionAlert transicao={TRANSICAO_ATIVA} />);
    expect(screen.getByText("Zona de Transição entre Fases")).toBeInTheDocument();
    expect(screen.getByText("A Grande Apostasia")).toBeInTheDocument();
    expect(screen.getByText("Manifestação e Tribulação")).toBeInTheDocument();
    expect(screen.getByText(/42\.0%/)).toBeInTheDocument();
    expect(screen.getByText(/38\.0%/)).toBeInTheDocument();
  });

  it("shows margin between phases and description", () => {
    render(<PhaseTransitionAlert transicao={TRANSICAO_ATIVA} />);
    expect(screen.getByText(/Δ 2\.0%/)).toBeInTheDocument();
    expect(screen.getByText(TRANSICAO_ATIVA.descricao)).toBeInTheDocument();
    expect(screen.getByText(/Proximidade relativa: 95%/)).toBeInTheDocument();
  });

  it("labels dominant and secondary phases", () => {
    render(<PhaseTransitionAlert transicao={TRANSICAO_ATIVA} />);
    expect(screen.getByText("Mais próxima")).toBeInTheDocument();
    expect(screen.getByText("Segunda mais próxima")).toBeInTheDocument();
  });
});
