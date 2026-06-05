import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InterpretationPanel } from "@/components/dashboard/InterpretationPanel";
import { INTERPRETACAO_COMPLETA } from "./fixtures";

describe("InterpretationPanel", () => {
  it("não renderiza quando interpretacao é undefined", () => {
    const { container } = render(<InterpretationPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza aderência, listas e citações", () => {
    render(<InterpretationPanel interpretacao={INTERPRETACAO_COMPLETA} />);
    expect(screen.getByText("Interpretação Hermenêutica")).toBeInTheDocument();
    expect(screen.getByText(/Aderência profética:/)).toHaveTextContent("55%");
    expect(screen.getByText("Conflitos regionais")).toBeInTheDocument();
    expect(screen.getByText("Sem sinais astronômicos")).toBeInTheDocument();
    expect(screen.getByText("Mt 24:6-7")).toBeInTheDocument();
    expect(screen.getByText("Ap 13:16-17")).toBeInTheDocument();
  });

  it("omite seções vazias", () => {
    render(
      <InterpretationPanel
        interpretacao={{ aderencia_profetica: 0.4, similaridades: [], divergencias: [], citacoes: [] }}
      />,
    );
    expect(screen.queryByText("Similaridades")).not.toBeInTheDocument();
    expect(screen.queryByText("Divergências")).not.toBeInTheDocument();
  });
});
