import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EventsList } from "@/components/dashboard/EventsList";
import { EVENTO_CONTRACAO, EVENTO_EXPANSAO } from "./fixtures";

describe("EventsList", () => {
  it("renderiza eventos com métricas e badges", () => {
    render(<EventsList eventos={[EVENTO_CONTRACAO, EVENTO_EXPANSAO]} />);
    expect(screen.getByText("conflito militar")).toBeInTheDocument();
    expect(screen.getByText("despertamento local")).toBeInTheDocument();
    expect(screen.getByText("contracao")).toBeInTheDocument();
    expect(screen.getByText("expansao")).toBeInTheDocument();
    expect(screen.getByText(/Tensão: 84%/)).toBeInTheDocument();
    expect(screen.getByText(/Impacto: 35%/)).toBeInTheDocument();
    expect(screen.getByText(EVENTO_CONTRACAO.descricao!)).toBeInTheDocument();
  });

  it("mostra mensagem quando lista vazia", () => {
    render(<EventsList eventos={[]} />);
    expect(screen.getByText("Nenhum evento processado")).toBeInTheDocument();
  });

  it("renderiza evento sem descrição", () => {
    const semDesc = { ...EVENTO_EXPANSAO, descricao: undefined };
    render(<EventsList eventos={[semDesc]} />);
    expect(screen.getByText("despertamento local")).toBeInTheDocument();
    expect(screen.queryByText(EVENTO_EXPANSAO.descricao!)).not.toBeInTheDocument();
  });
});
