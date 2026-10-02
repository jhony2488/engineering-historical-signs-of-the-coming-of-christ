import { describe, expect, it } from "vitest";

import { getMockAmeacaDetail, MOCK_AMEACAS } from "@/lib/mock-ameacas";
import { normalizeJoshuaRecord, toIso3, getJoshuaSeedRecords } from "@/lib/db/joshua";

describe("joshua normalize", () => {
  it("converte ISO2 para ISO3", () => {
    expect(toIso3("BR")).toBe("BRA");
    expect(toIso3("usa")).toBe("USA");
  });

  it("normaliza registro bruto", () => {
    const n = normalizeJoshuaRecord({
      PeopIDInJP: "PG_1",
      PeopNameInCountry: "Test People",
      ROG3: "BR",
      Population: 1000,
      JPScale: 2,
      BibleStatus: "NONE",
    });
    expect(n).not.toBeNull();
    expect(n!.countryCode).toBe("BRA");
    expect(n!.joshuaScale).toBe(2);
    expect(n!.dataHash).toHaveLength(64);
  });

  it("seed tem países foco", () => {
    const seeds = getJoshuaSeedRecords();
    expect(seeds.length).toBeGreaterThanOrEqual(3);
    expect(seeds.some((s) => s.countryCode === "BRA")).toBe(true);
  });
});

describe("globo joshua mock", () => {
  it("ISR mock inclui joshua scores", () => {
    const isr = MOCK_AMEACAS.find((a) => a.country_code === "ISR");
    expect(isr?.joshua?.avg_joshua_scale).toBeDefined();
    const detail = getMockAmeacaDetail("ISR");
    expect(detail?.provenance?.integrity_ok).toBe(true);
  });
});
