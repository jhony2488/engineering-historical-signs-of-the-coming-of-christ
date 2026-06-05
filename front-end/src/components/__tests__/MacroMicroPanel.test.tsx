import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MacroMicroPanel } from "@/components/dashboard/MacroMicroPanel";

describe("MacroMicroPanel", () => {
  it("exibe split macro/micro complementar", () => {
    render(<MacroMicroPanel macroRatio={0.68} avgTension={0.72} avgImpact={0.65} />);
    expect(screen.getByText("68%")).toBeInTheDocument();
    expect(screen.getByText("32%")).toBeInTheDocument();
    expect(screen.getByText(/Tensão média:/)).toHaveTextContent("72%");
    expect(screen.getByText(/Impacto global:/)).toHaveTextContent("65%");
  });

  it("usa defaults quando props omitidas", () => {
    render(<MacroMicroPanel />);
    expect(screen.getAllByText("50%")).toHaveLength(2);
    expect(screen.getByText(/Tensão média:/)).toHaveTextContent("0%");
  });
});
