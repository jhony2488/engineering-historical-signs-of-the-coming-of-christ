import { describe, expect, it } from "vitest";
import { MOCK_RESULTADO, generateMockHistorico } from "@/lib/mock";
describe("mock", () => {
  it("MOCK_RESULTADO has valid minimal structure", () => {
    expect(MOCK_RESULTADO.fase_atual).toBe("FASE_II");
    expect(MOCK_RESULTADO.ranking_mar).toHaveLength(10);
    expect(MOCK_RESULTADO.ranking_terra).toHaveLength(10);
  });
  it("generateMockHistorico generates series with size days+1", () => {
    expect(generateMockHistorico(7)).toHaveLength(8);
  });
  it("generateMockHistorico keeps indices within bounds", () => {
    for (const item of generateMockHistorico(30)) {
      expect(item.indice_global).toBeGreaterThanOrEqual(0.2);
      expect(item.indice_global).toBeLessThanOrEqual(0.95);
    }
  });
});
