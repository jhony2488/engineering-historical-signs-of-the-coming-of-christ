import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARC_BULGE_PX, MARGIN_X } from "@/lib/utils/constants";
import {
  arcPoint,
  clampPoint,
  footerCenterPoint,
  lateralPoint,
  pointFromMouse,
} from "@/lib/utils/geometry";

const SIZE = { width: 200, height: 260 };

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    writable: true,
    configurable: true,
    value: height,
  });
}

describe("utils/geometry", () => {
  beforeEach(() => {
    setViewport(1280, 800);
    document.body.innerHTML = "";
  });

  afterEach(() => {
    setViewport(1280, 800);
    document.body.innerHTML = "";
  });

  describe("clampPoint", () => {
    it("keeps point within viewport bounds", () => {
      const result = clampPoint({ x: 500, y: 300 }, SIZE);

      expect(result.x).toBe(500);
      expect(result.y).toBe(300);
    });

    it("clamps coordinates below minimum margin", () => {
      const result = clampPoint({ x: -50, y: -20 }, SIZE);

      expect(result.x).toBe(MARGIN_X);
      expect(result.y).toBe(MARGIN_X);
    });

    it("clamps coordinates above maximum allowed", () => {
      setViewport(400, 300);
      const maxX = 400 - SIZE.width - MARGIN_X;
      const maxY = 300 - SIZE.height - MARGIN_X;

      const result = clampPoint({ x: 999, y: 999 }, SIZE);

      expect(result.x).toBe(maxX);
      expect(result.y).toBe(maxY);
    });
  });

  describe("lateralPoint", () => {
    it("positions on left side vertically centered", () => {
      const result = lateralPoint("left", SIZE);

      expect(result.x).toBe(MARGIN_X);
      expect(result.y).toBe((800 - SIZE.height) / 2);
    });

    it("positions on right side vertically centered", () => {
      const result = lateralPoint("right", SIZE);

      expect(result.x).toBe(1280 - SIZE.width - MARGIN_X);
      expect(result.y).toBe((800 - SIZE.height) / 2);
    });
  });

  describe("footerCenterPoint", () => {
    it("uses footer when [data-site-footer] exists", () => {
      setViewport(1280, 1000);
      const footer = document.createElement("footer");
      footer.setAttribute("data-site-footer", "");
      vi.spyOn(footer, "getBoundingClientRect").mockReturnValue({
        top: 700,
        height: 80,
        left: 0,
        right: 0,
        bottom: 780,
        width: 1280,
        x: 0,
        y: 700,
        toJSON: () => ({}),
      });
      document.body.appendChild(footer);

      const result = footerCenterPoint(SIZE);

      expect(result.x).toBe((1280 - SIZE.width) / 2);
      expect(result.y).toBe(700 + 80 / 2 - SIZE.height / 2);
    });

    it("uses fallback and clamps Y when footer is missing", () => {
      setViewport(1280, 900);
      const result = footerCenterPoint(SIZE);
      const maxY = 900 - SIZE.height - MARGIN_X;

      expect(result.x).toBe((1280 - SIZE.width) / 2);
      expect(result.y).toBe(maxY);
      expect(900 - 72 - SIZE.height / 2).toBeGreaterThan(maxY);
    });

    it("applies clamp when footer is below viewport limit", () => {
      setViewport(1280, 800);
      const footer = document.createElement("footer");
      footer.setAttribute("data-site-footer", "");
      vi.spyOn(footer, "getBoundingClientRect").mockReturnValue({
        top: 700,
        height: 80,
        left: 0,
        right: 0,
        bottom: 780,
        width: 1280,
        x: 0,
        y: 700,
        toJSON: () => ({}),
      });
      document.body.appendChild(footer);

      const maxY = 800 - SIZE.height - MARGIN_X;
      expect(footerCenterPoint(SIZE).y).toBe(maxY);
    });
  });

  describe("arcPoint", () => {
    const from = { x: 10, y: 100 };
    const to = { x: 210, y: 500 };

    it("returns start point at t=0", () => {
      expect(arcPoint(0, from, to)).toEqual(from);
    });

    it("returns end point at t=1", () => {
      expect(arcPoint(1, from, to)).toEqual(to);
    });

    it("interpolates with bulge at arc midpoint", () => {
      const mid = arcPoint(0.5, from, to);
      const cx = (from.x + to.x) / 2;
      const cy = (from.y + to.y) / 2 - ARC_BULGE_PX;

      expect(mid.x).toBeCloseTo(0.25 * from.x + 0.5 * cx + 0.25 * to.x);
      expect(mid.y).toBeCloseTo(0.25 * from.y + 0.5 * cy + 0.25 * to.y);
      expect(mid.y).toBeLessThan((from.y + to.y) / 2);
    });

    it("clamps t outside [0, 1] range", () => {
      expect(arcPoint(-1, from, to)).toEqual(from);
      expect(arcPoint(2, from, to)).toEqual(to);
    });
  });

  describe("pointFromMouse", () => {
    it("centers scene on mouse cursor", () => {
      const result = pointFromMouse(420, 310, SIZE);

      expect(result.x).toBe(420 - SIZE.width / 2);
      expect(result.y).toBe(310 - SIZE.height / 2);
    });

    it("applies clamp when cursor is near the edge", () => {
      const result = pointFromMouse(5, 5, SIZE);

      expect(result.x).toBe(MARGIN_X);
      expect(result.y).toBe(MARGIN_X);
    });
  });
});
