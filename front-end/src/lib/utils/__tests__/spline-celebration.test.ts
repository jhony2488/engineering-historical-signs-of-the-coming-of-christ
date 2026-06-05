import { describe, expect, it } from "vitest";

import {
  computeCelebrationCenterPosition,
  computeCelebrationSceneSize,
} from "@/lib/spline-celebration";

const BASE = { width: 200, height: 260 };

describe("spline-celebration", () => {
  it("computes scene size filling up to 80% of viewport", () => {
    const size = computeCelebrationSceneSize(BASE, { width: 1000, height: 800 });

    expect(size.height).toBe(640);
    expect(size.width).toBe(Math.round(640 * (BASE.width / BASE.height)));
    expect(size.width).toBeLessThanOrEqual(800);
    expect(size.height).toBeLessThanOrEqual(640);
  });

  it("limits height when viewport is short", () => {
    const size = computeCelebrationSceneSize(BASE, { width: 1200, height: 500 });

    expect(size.height).toBe(400);
    expect(size.width).toBe(Math.round(400 * (BASE.width / BASE.height)));
  });

  it("centers scene in viewport", () => {
    const size = { width: 400, height: 520 };
    const position = computeCelebrationCenterPosition(size, { width: 1000, height: 800 });

    expect(position).toEqual({ x: 300, y: 140 });
  });
});
