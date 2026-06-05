import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProximityMeter } from "@/components/dashboard/ProximityMeter";

describe("ProximityMeter", () => {
  it("exibe índice arredondado e confiança", () => {
    render(<ProximityMeter indice={0.584} confianca={0.712} />);
    expect(screen.getByText("58%")).toBeInTheDocument();
    expect(screen.getByText("71.2%")).toBeInTheDocument();
    expect(screen.getByText("Medidor de Proximidade Espiritual")).toBeInTheDocument();
  });

  it("exibe posterior Bayes quando informado", () => {
    render(<ProximityMeter indice={0.5} confianca={0.6} posteriorBayes={0.55} />);
    expect(screen.getByText("Bayes")).toBeInTheDocument();
    expect(screen.getByText("55.0%")).toBeInTheDocument();
  });

  it("omite bloco Bayes quando posterior é undefined", () => {
    render(<ProximityMeter indice={0.5} confianca={0.6} />);
    expect(screen.queryByText("Bayes")).not.toBeInTheDocument();
  });

  it("aplica rotação do ponteiro proporcional ao índice", () => {
    const { container } = render(<ProximityMeter indice={0.75} confianca={0.8} />);
    const needle = container.querySelector("[style*='rotate']");
    expect(needle?.getAttribute("style")).toContain("rotate(45deg)");
  });
});
