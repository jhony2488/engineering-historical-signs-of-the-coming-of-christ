import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getGaMeasurementId,
  isPublicAnalyticsPath,
} from "@/lib/analytics/config";

describe("analytics config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("aceita measurement id válido", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-ABC123");
    expect(getGaMeasurementId()).toBe("G-ABC123");
  });

  it("rejeita measurement id inválido", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "UA-OLD");
    expect(getGaMeasurementId()).toBeUndefined();
  });

  it("rastreia apenas rotas públicas", () => {
    expect(isPublicAnalyticsPath("/")).toBe(true);
    expect(isPublicAnalyticsPath("/rankings")).toBe(true);
    expect(isPublicAnalyticsPath("/historico")).toBe(false);
    expect(isPublicAnalyticsPath("/insights")).toBe(false);
    expect(isPublicAnalyticsPath("/login")).toBe(false);
  });
});
