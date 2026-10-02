import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const PUBLIC = path.resolve(__dirname, "../../../public");

describe("PWA", () => {
  const manifest = JSON.parse(
    readFileSync(path.join(PUBLIC, "site.webmanifest"), "utf-8"),
  ) as {
    name: string;
    display: string;
    icons: { src: string; sizes?: string; purpose?: string }[];
  };

  it("manifest é standalone e tem nome pt-BR", () => {
    expect(manifest.display).toBe("standalone");
    expect(manifest.name).toContain("Sinais");
  });

  it("ícones PNG 192/512/maskable existem em public/icons/", () => {
    const required = ["192x192", "512x512"];
    const sizes = manifest.icons.map((i) => i.sizes);
    for (const s of required) expect(sizes).toContain(s);
    expect(manifest.icons.some((i) => i.purpose === "maskable")).toBe(true);
    for (const icon of manifest.icons) {
      expect(existsSync(path.join(PUBLIC, icon.src))).toBe(true);
    }
  });

  it("sw.js existe e não intercepta CDN de modelos", () => {
    const sw = readFileSync(path.join(PUBLIC, "sw.js"), "utf-8");
    expect(sw).toContain("huggingface.co");
    expect(sw).toContain("/offline.html");
    expect(sw).toContain("/models/");
  });

  it("offline.html existe", () => {
    expect(existsSync(path.join(PUBLIC, "offline.html"))).toBe(true);
  });
});
