import { describe, expect, it } from "vitest";

import { ProximityMeter } from "@/components/dashboard/ProximityMeter";
import { render, screen } from "@testing-library/react";

describe("ProximityMeter", () => {
  it("renders global index fallback label when proximidade is omitted", () => {
    render(<ProximityMeter indice={0.584} confianca={0.712} />);
    expect(screen.getByText("Índice global (legado)")).toBeInTheDocument();
    expect(screen.getByText("58%")).toBeInTheDocument();
  });

  it("renders dedicated spiritual proximity when provided", () => {
    render(
      <ProximityMeter
        proximidade={0.72}
        indice={0.5}
        confianca={0.6}
        posteriorBayes={0.55}
        convergenciaDimensao={0.8}
        convergenciaEnergia={0.7}
        descricao="Alta convergência"
      />,
    );
    expect(screen.getByText("72%")).toBeInTheDocument();
    expect(screen.getByText(/Convergência Macro\/Micro/)).toBeInTheDocument();
    expect(screen.getByText("Alta convergência")).toBeInTheDocument();
    expect(screen.getByText("Bayes")).toBeInTheDocument();
  });

  it("exposes meter role for accessibility", () => {
    const { container } = render(<ProximityMeter indice={0.75} confianca={0.8} />);
    expect(container.querySelector('[role="meter"]')).toBeTruthy();
  });
});
