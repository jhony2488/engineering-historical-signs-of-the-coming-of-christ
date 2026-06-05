import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EnergyPanel } from "@/components/dashboard/EnergyPanel";
import { EVENTO_CONTRACAO, EVENTO_EXPANSAO } from "./fixtures";

describe("EnergyPanel", () => {
  it("calculates proportions from events", () => {
    render(<EnergyPanel eventos={[EVENTO_EXPANSAO, EVENTO_CONTRACAO, EVENTO_CONTRACAO]} />);
    expect(screen.getByText("33%")).toBeInTheDocument();
    expect(screen.getByText("67%")).toBeInTheDocument();
    expect(screen.getByText("Expansão (Luz)")).toBeInTheDocument();
    expect(screen.getByText("Contração (Sombra)")).toBeInTheDocument();
  });

  it("uses explicit expansaoRatio when provided", () => {
    render(<EnergyPanel eventos={[EVENTO_EXPANSAO]} expansaoRatio={0.8} />);
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByText("20%")).toBeInTheDocument();
  });

  it("handles empty list without division by zero", () => {
    render(<EnergyPanel eventos={[]} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });
});
