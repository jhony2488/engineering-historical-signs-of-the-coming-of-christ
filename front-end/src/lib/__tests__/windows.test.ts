import { describe, expect, it } from "vitest";
import {
  JANELAS_UI,
  WINDOW_DAYS,
  snapshotJanelaHibrida,
  snapshotJanelaNivel2,
} from "@/lib/windows";

describe("windows", () => {
  it("includes semiannual window", () => {
    expect(WINDOW_DAYS.semiannual).toBe(180);
    expect(JANELAS_UI.map((j) => j.id)).toContain("semiannual");
  });

  it("maps level 2 and hybrid snapshots", () => {
    expect(snapshotJanelaNivel2("monthly")).toBe("monthly");
    expect(snapshotJanelaHibrida("quarterly")).toBe("quarterly_hybrid");
    expect(snapshotJanelaHibrida("semiannual")).toBe("semiannual_hybrid");
    expect(snapshotJanelaHibrida("weekly")).toBeNull();
  });
});
