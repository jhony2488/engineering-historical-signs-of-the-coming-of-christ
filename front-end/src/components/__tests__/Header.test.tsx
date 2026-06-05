import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Header } from "@/components/ui/Header";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));



describe("Header", () => {

  it("renderiza navegação pública (somente leitura)", () => {

    render(<Header />);

    expect(screen.getByText("Monitor Escatológico")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Painel" })).toHaveAttribute("href", "/");

    expect(screen.getByRole("link", { name: "Rankings" })).toHaveAttribute("href", "/rankings");

    expect(screen.queryByRole("link", { name: "Histórico" })).not.toBeInTheDocument();

    expect(screen.queryByRole("link", { name: "Simulador" })).not.toBeInTheDocument();

    expect(screen.queryByRole("link", { name: "Grafo" })).not.toBeInTheDocument();

  });



  it("variante admin exibe rotas restritas e sair", () => {

    render(<Header variant="admin" />);

    expect(screen.getByRole("link", { name: "Histórico" })).toHaveAttribute("href", "/historico");

    expect(screen.getByRole("link", { name: "Simulador" })).toHaveAttribute("href", "/simulador");

    expect(screen.getByRole("link", { name: "Grafo" })).toHaveAttribute("href", "/grafo");

    expect(screen.getByRole("link", { name: "Revisão" })).toHaveAttribute("href", "/revisao");

    expect(screen.getByRole("link", { name: "Insights" })).toHaveAttribute("href", "/insights");

    expect(screen.getByRole("button", { name: "Sair" })).toBeInTheDocument();

  });



  it("não exibe metadados sem dataReferencia", () => {

    render(<Header />);

    expect(screen.queryByText(/Ref:/)).not.toBeInTheDocument();

  });



  it("exibe metadados de referência e fonte", () => {

    render(<Header dataReferencia="2026-06-04" fromCache isMock dataSource="db" />);

    expect(screen.getByText(/Ref: 2026-06-04/)).toBeInTheDocument();

    expect(screen.getByText(/cache/)).toBeInTheDocument();

    expect(screen.getByText(/demo/)).toBeInTheDocument();

    expect(screen.getByText(/db/)).toBeInTheDocument();

  });

});

