import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SynthesisPanel } from "@/components/historico/SynthesisPanel";
import { SNAPSHOT_NIVEL2, SNAPSHOT_NIVEL3 } from "./fixtures";

describe("SynthesisPanel", () => {
  it("exibe estado de carregamento", () => {
    render(<SynthesisPanel snapshot={null} hybrid={null} loading />);
    expect(screen.getByText(/Carregando síntese do período/)).toBeInTheDocument();
  });

  it("exibe fallback quando não há snapshots", () => {
    render(<SynthesisPanel snapshot={null} hybrid={null} />);
    expect(screen.getByText(/Nenhum snapshot de síntese/)).toBeInTheDocument();
  });

  it("renderiza painel Nível 2 com delta e padrões", () => {
    render(
      <SynthesisPanel
        snapshot={SNAPSHOT_NIVEL2}
        hybrid={null}
        motorLabel="Nível 2 — Estratégica"
      />,
    );
    expect(screen.getByText("Motor Nível 2")).toBeInTheDocument();
    expect(screen.getByText("Mensal (Estratégica)")).toBeInTheDocument();
    expect(screen.getByText(/Síntese mensal/)).toBeInTheDocument();
    expect(screen.getByText(/Padrão A/)).toBeInTheDocument();
    expect(screen.getByText("41.0%")).toBeInTheDocument();
    expect(screen.getByText("58.0%")).toBeInTheDocument();
    expect(screen.getByText(/\+17\.0 pp/)).toBeInTheDocument();
  });

  it("renderiza painel Nível 3 híbrido", () => {
    render(<SynthesisPanel snapshot={null} hybrid={SNAPSHOT_NIVEL3} />);
    expect(screen.getByText("Motor Nível 3")).toBeInTheDocument();
    expect(screen.getByText(/Panorama anual/)).toBeInTheDocument();
    expect(screen.getByText(/Fase emergente: II/)).toBeInTheDocument();
    expect(screen.getByText(/Mt 24:6-7/)).toBeInTheDocument();
  });

  it("renderiza ambos os painéis lado a lado", () => {
    render(<SynthesisPanel snapshot={SNAPSHOT_NIVEL2} hybrid={SNAPSHOT_NIVEL3} />);
    expect(screen.getByText("Motor Nível 2")).toBeInTheDocument();
    expect(screen.getByText("Motor Nível 3")).toBeInTheDocument();
  });
});
