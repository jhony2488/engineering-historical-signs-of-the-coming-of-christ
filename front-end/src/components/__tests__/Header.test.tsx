import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Header } from "@/components/ui/Header";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));



describe("Header", () => {

  it("renders public read-only navigation", () => {

    render(<Header />);

    expect(screen.getByText("Monitor Escatológico")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Painel" })).toHaveAttribute("href", "/");

    expect(screen.getByRole("link", { name: "Profecias" })).toHaveAttribute("href", "/profecias");

    expect(screen.getByRole("link", { name: "Rankings" })).toHaveAttribute("href", "/rankings");

    expect(screen.queryByRole("link", { name: "Histórico" })).not.toBeInTheDocument();

    expect(screen.queryByRole("link", { name: "Simulador" })).not.toBeInTheDocument();

    expect(screen.queryByRole("link", { name: "Grafo" })).not.toBeInTheDocument();

  });



  it("admin variant shows restricted routes and logout", () => {

    render(<Header variant="admin" />);

    expect(screen.getByRole("link", { name: "Histórico" })).toHaveAttribute("href", "/historico");

    expect(screen.getByRole("link", { name: "Simulador" })).toHaveAttribute("href", "/simulador");

    expect(screen.getByRole("link", { name: "Grafo" })).toHaveAttribute("href", "/grafo");

    expect(screen.getByRole("link", { name: "Revisão" })).toHaveAttribute("href", "/revisao");

    expect(screen.getByRole("link", { name: "Insights" })).toHaveAttribute("href", "/insights");

    expect(screen.getByRole("button", { name: "Sair da área administrativa" })).toBeInTheDocument();

  });



  it("does not show metadata without dataReferencia", () => {

    render(<Header />);

    expect(screen.queryByText(/Ref:/)).not.toBeInTheDocument();

  });



  it("shows reference date and source metadata", () => {

    render(<Header dataReferencia="2026-06-04" fromCache isMock dataSource="db" />);

    expect(screen.getByText(/Ref: 2026-06-04/)).toBeInTheDocument();

    expect(screen.getByText(/cache/)).toBeInTheDocument();

    expect(screen.getByText(/demo/)).toBeInTheDocument();

    expect(screen.getByText(/db/)).toBeInTheDocument();

  });

});

