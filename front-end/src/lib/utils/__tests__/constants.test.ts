import { describe, expect, it } from "vitest";

import {
  ARC_BULGE_PX,
  HIDDEN_ROUTE_PREFIXES,
  MARGIN_X,
  PIN_DURATION_MS,
  SCENE_SIZE,
  SCROLL_DISTANCE_FOR_CENTER,
  SCROLL_STOP_DELAY_MS,
  SPLINE_SCENE_PATH,
} from "@/lib/utils/constants";

describe("utils/constants", () => {
  it("defines default Spline scene path", () => {
    expect(SPLINE_SCENE_PATH).toBe(
      "/biblically_accurate_angel_eyes_and_rings.spline",
    );
  });

  it("defines scene dimensions and margins", () => {
    expect(SCENE_SIZE).toEqual({ width: 200, height: 260 });
    expect(MARGIN_X).toBe(1);
    expect(ARC_BULGE_PX).toBeGreaterThan(0);
  });

  it("defines positive scroll and pin timing constants", () => {
    expect(SCROLL_DISTANCE_FOR_CENTER).toBe(300);
    expect(SCROLL_STOP_DELAY_MS).toBe(200);
    expect(PIN_DURATION_MS).toBe(10_000);
  });

  it("lists routes where the Spline companion is hidden", () => {
    expect(HIDDEN_ROUTE_PREFIXES).toContain("/login");
    expect(HIDDEN_ROUTE_PREFIXES).toContain("/grafo");
    expect(HIDDEN_ROUTE_PREFIXES).toContain("/historico");
    expect(HIDDEN_ROUTE_PREFIXES).toHaveLength(6);
  });
});
