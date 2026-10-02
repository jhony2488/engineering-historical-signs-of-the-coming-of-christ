import { afterEach, describe, expect, it, vi } from "vitest";

import { probeDeviceCapabilities } from "@/lib/local-ai/capabilities";

const GIB = 1024 ** 3;

function stubNavigator(overrides: Record<string, unknown>) {
  vi.stubGlobal("navigator", {
    hardwareConcurrency: 8,
    connection: { saveData: false, effectiveType: "4g" },
    storage: {
      estimate: () => Promise.resolve({ quota: 8 * GIB }),
      persisted: () => Promise.resolve(false),
    },
    ...overrides,
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("probeDeviceCapabilities", () => {
  it("sem WebGPU e sem WebNN → tier c em WASM", async () => {
    stubNavigator({});
    const p = await probeDeviceCapabilities();
    expect(p.supported).toBe(true);
    expect(p.tier).toBe("c");
    expect(p.backends).toContain("wasm");
  });

  it("WebGPU forte + RAM alta → tier a", async () => {
    stubNavigator({
      deviceMemory: 16,
      gpu: {
        requestAdapter: () =>
          Promise.resolve({ limits: { maxBufferSize: 4 * GIB } }),
      },
    });
    const p = await probeDeviceCapabilities();
    expect(p.supported).toBe(true);
    expect(p.tier).toBe("a");
    expect(p.backends[0]).toBe("webgpu");
  });

  it("WebGPU + RAM modesta → tier b", async () => {
    stubNavigator({
      deviceMemory: 4,
      gpu: { requestAdapter: () => Promise.resolve({ limits: {} }) },
    });
    const p = await probeDeviceCapabilities();
    expect(p.tier).toBe("b");
  });

  it("quota abaixo do mínimo → unsupported", async () => {
    stubNavigator({
      storage: {
        estimate: () => Promise.resolve({ quota: 500 * 1024 * 1024 }),
        persisted: () => Promise.resolve(false),
      },
    });
    const p = await probeDeviceCapabilities();
    expect(p.supported).toBe(false);
    expect(p.reasons).toContain("quota_insuficiente");
  });

  it("saveData marca meteredConnection (opt-in)", async () => {
    stubNavigator({ connection: { saveData: true, effectiveType: "4g" } });
    const p = await probeDeviceCapabilities();
    expect(p.supported).toBe(true);
    expect(p.meteredConnection).toBe(true);
  });

  it("adapter WebGPU null → cai para tier c", async () => {
    stubNavigator({ gpu: { requestAdapter: () => Promise.resolve(null) } });
    const p = await probeDeviceCapabilities();
    expect(p.tier).toBe("c");
  });
});
