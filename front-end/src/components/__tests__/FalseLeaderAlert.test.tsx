import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FalseLeaderAlert } from "@/components/dashboard/FalseLeaderAlert";

describe("FalseLeaderAlert", () => {
  it("renders active alert with optional scores", () => {
    render(
      <FalseLeaderAlert
        alerta
        scoreIncongruencia={0.74}
        justificativa="Divergência discurso vs estrutura."
        scoreExpansao={0.78}
        scoreContracao={0.74}
      />,
    );
    expect(screen.getByText(/Alerta de engano sistêmico/)).toBeInTheDocument();
    expect(screen.getAllByText("74%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("78%")).toBeInTheDocument();
    expect(screen.getByText("Divergência discurso vs estrutura.")).toBeInTheDocument();
  });

  it("renders no-alert state", () => {
    render(<FalseLeaderAlert alerta={false} scoreIncongruencia={0.2} />);
    expect(screen.getByText(/Sem alerta de falso líder/)).toBeInTheDocument();
    expect(screen.queryByText(/Alerta de engano sistêmico/)).not.toBeInTheDocument();
  });

  it("omits discourse and structure columns when undefined", () => {
    render(<FalseLeaderAlert alerta scoreIncongruencia={0.5} />);
    expect(screen.queryByText("Discurso")).not.toBeInTheDocument();
    expect(screen.queryByText("Estrutura")).not.toBeInTheDocument();
  });
});
