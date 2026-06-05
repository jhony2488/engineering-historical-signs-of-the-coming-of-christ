import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BeastScores } from "@/components/dashboard/BeastScores";

describe("BeastScores", () => {
  it("renderiza barras das duas bestas", () => {
    render(<BeastScores bestaMar={0.61} bestaTerra={0.54} />);
    expect(screen.getByText("Consolidação das Bestas")).toBeInTheDocument();
    expect(screen.getByText("61.0%")).toBeInTheDocument();
    expect(screen.getByText("54.0%")).toBeInTheDocument();
    expect(screen.getByText(/Besta do Mar/)).toBeInTheDocument();
    expect(screen.getByText(/Besta da Terra/)).toBeInTheDocument();
  });

  it("limita largura da barra a 100% para valores acima de 1", () => {
    const { container } = render(<BeastScores bestaMar={1.5} bestaTerra={0.3} />);
    const bars = container.querySelectorAll("[style*='width']");
    const marBar = Array.from(bars).find((el) => el.getAttribute("style")?.includes("100%"));
    expect(marBar).toBeTruthy();
  });
});
