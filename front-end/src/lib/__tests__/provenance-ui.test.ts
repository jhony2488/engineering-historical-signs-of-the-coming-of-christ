import { describe, expect, it } from "vitest";

import { getMockAmeacaDetail } from "@/lib/mock-ameacas";

describe("provenance verify UI contract", () => {
  it("mock detail exposes integrity_ok for drawer verify", () => {
    const detail = getMockAmeacaDetail("ISR");
    expect(detail?.provenance).toBeDefined();
    expect(typeof detail?.provenance?.integrity_ok).toBe("boolean");
    expect(detail?.provenance?.merkle_root || detail?.provenance?.stages).toBeTruthy();
  });
});
