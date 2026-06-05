import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotFound from "@/app/not-found";

describe("NotFound", () => {
  it("renders 404 code and navigation links", () => {
    render(<NotFound />);
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("Sinal não mapeado")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar ao painel" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Ver rankings" })).toHaveAttribute("href", "/rankings");
    expect(screen.getByRole("link", { name: "Painel" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Rankings" })).toHaveAttribute("href", "/rankings");
    expect(screen.queryByRole("link", { name: "Histórico" })).not.toBeInTheDocument();
  });
});
