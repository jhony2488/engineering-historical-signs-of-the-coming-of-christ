import { describe, expect, it } from "vitest";

import { MOCK_AMEACAS, getMockAmeacaDetail } from "@/lib/mock-ameacas";

describe("mock ameacas / globo", () => {
  it("tem países com coordenadas para o heatmap", () => {
    expect(MOCK_AMEACAS.length).toBeGreaterThanOrEqual(3);
    for (const a of MOCK_AMEACAS) {
      expect(typeof a.lat).toBe("number");
      expect(typeof a.lng).toBe("number");
      expect(a.risk_score).toBeGreaterThanOrEqual(0);
      expect(a.risk_score).toBeLessThanOrEqual(1);
    }
  });

  it("detalhe unifica L10 L11 L12 L13 L15", () => {
    const detail = getMockAmeacaDetail("ISR");
    expect(detail).not.toBeNull();
    expect(detail!.ameaca.historical_echo).toBeTruthy();
    expect(detail!.ameaca.joshua?.peoples_count).toBeGreaterThan(0);
    expect(detail!.abm?.fragility_index).toBeGreaterThan(0);
    expect(detail!.abm?.probabilistic_outcomes).toBeTruthy();
    expect(detail!.adversarial?.counter_thesis).toBeTruthy();
    expect(detail!.adversarial?.fragile_premises?.length).toBeGreaterThan(0);
    expect(detail!.recomendacoes?.length).toBeGreaterThan(0);
    expect(detail!.provenance?.integrity_ok).toBe(true);
  });
});
