import { describe, expect, it } from "vitest";
import { buildPageMetadata, rootMetadata, siteConfig } from "@/lib/seo/metadata";
describe("seo/metadata", () => {
  it("siteConfig tem nome e url", () => {
    expect(siteConfig.name).toBe("Engenharia de Sinais Históricos");
    expect(siteConfig.url).toMatch(/^https?:\/\//);
  });
  it("buildPageMetadata gera canonical e openGraph", () => {
    const meta = buildPageMetadata({ title: "Historico", description: "Serie", path: "/historico" });
    expect(meta.alternates?.canonical).toContain("/historico");
    expect(meta.openGraph?.images?.[0]).toMatchObject({ url: "/og-default.svg" });
  });
  it("rootMetadata define template", () => {
    expect(rootMetadata.title).toMatchObject({ template: expect.stringContaining(siteConfig.name) });
  });
});
