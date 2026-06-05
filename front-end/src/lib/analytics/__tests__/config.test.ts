import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getGaMeasurementId,
  isPublicAnalyticsPath,
} from "@/lib/analytics/config";

describe("analytics config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts valid measurement id", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-ABC123");
    expect(getGaMeasurementId()).toBe("G-ABC123");
  });

  it("rejects invalid measurement id", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "UA-OLD");
    expect(getGaMeasurementId()).toBeUndefined();
  });

  it("tracks only public routes", () => {
    expect(isPublicAnalyticsPath("/")).toBe(true);
    expect(isPublicAnalyticsPath("/rankings")).toBe(true);
    expect(isPublicAnalyticsPath("/historico")).toBe(false);
    expect(isPublicAnalyticsPath("/insights")).toBe(false);
    expect(isPublicAnalyticsPath("/login")).toBe(false);
  });
});
