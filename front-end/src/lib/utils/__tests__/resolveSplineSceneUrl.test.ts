import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SPLINE_SCENE_PATH } from "@/lib/utils/constants";
import {
  isSplineRuntimeSceneUrl,
  resolveSplineSceneUrl,
} from "@/lib/utils/resolveSplineSceneUrl";

describe("utils/resolveSplineSceneUrl", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SPLINE_SCENE_URL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("resolveSplineSceneUrl", () => {
    it("uses NEXT_PUBLIC_SPLINE_SCENE_URL when set", () => {
      vi.stubEnv(
        "NEXT_PUBLIC_SPLINE_SCENE_URL",
        "https://prod.spline.design/abc/scene.splinecode",
      );

      expect(resolveSplineSceneUrl()).toBe(
        "https://prod.spline.design/abc/scene.splinecode",
      );
    });

    it("prefixes relative path with origin in the browser", () => {
      expect(resolveSplineSceneUrl()).toBe(
        `${window.location.origin}${SPLINE_SCENE_PATH}`,
      );
    });

    it("returns absolute env URL without prefixing origin", () => {
      vi.stubEnv(
        "NEXT_PUBLIC_SPLINE_SCENE_URL",
        "  https://cdn.example.com/scene.splinecode  ",
      );

      expect(resolveSplineSceneUrl()).toBe(
        "https://cdn.example.com/scene.splinecode",
      );
    });

    it("prefixes relative env path with origin", () => {
      vi.stubEnv("NEXT_PUBLIC_SPLINE_SCENE_URL", "/custom/scene.splinecode");

      expect(resolveSplineSceneUrl()).toBe(
        `${window.location.origin}/custom/scene.splinecode`,
      );
    });
  });

  describe("isSplineRuntimeSceneUrl", () => {
    it("accepts .splinecode files", () => {
      expect(isSplineRuntimeSceneUrl("/public/scene.splinecode")).toBe(true);
      expect(isSplineRuntimeSceneUrl("/scene.SPLINECODE?cache=1")).toBe(true);
    });

    it("accepts spline.design domain URLs", () => {
      expect(
        isSplineRuntimeSceneUrl("https://prod.spline.design/foo/scene.splinecode"),
      ).toBe(true);
      expect(isSplineRuntimeSceneUrl("https://app.spline.design/share/abc")).toBe(
        true,
      );
    });

    it("rejects editor .spline files", () => {
      expect(
        isSplineRuntimeSceneUrl("/biblically_accurate_angel_eyes_and_rings.spline"),
      ).toBe(false);
    });

    it("accepts other URLs without .spline extension", () => {
      expect(isSplineRuntimeSceneUrl("https://example.com/scene")).toBe(true);
    });
  });
});
