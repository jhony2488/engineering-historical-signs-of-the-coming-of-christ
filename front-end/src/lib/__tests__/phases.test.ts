import { describe, expect, it } from "vitest";
import { FASES, formatPercent, getFase } from "@/lib/phases";

describe("phases", () => {
  it("defines the four eschatological phases", () => {
    expect(FASES).toHaveLength(4);
    expect(FASES.map((f) => f.id)).toEqual(["FASE_I", "FASE_II", "FASE_III", "FASE_IV"]);
  });
  it("getFase returns the correct phase", () => {
    expect(getFase("FASE_III").titulo).toBe("Manifestação e Tribulação");
  });
  it("getFase falls back to FASE_I", () => {
    expect(getFase("INVALID" as "FASE_I").id).toBe("FASE_I");
  });
  it("formatPercent formats decimal values", () => {
    expect(formatPercent(0.583)).toBe("58.3%");
    expect(formatPercent(1, 0)).toBe("100%");
  });
});
