import { describe, expect, it } from "vitest";
import { buildPageMetadata, rootMetadata, siteConfig } from "@/lib/seo/metadata";
describe("seo/metadata", () => {
  it("siteConfig has name and url", () => {
    expect(siteConfig.name).toBe("Engenharia de Sinais Históricos");
    expect(siteConfig.url).toMatch(/^https?:\/\//);
  });
  it("buildPageMetadata generates canonical and openGraph", () => {
    const meta = buildPageMetadata({ title: "Historico", description: "Serie", path: "/historico" });
    expect(meta.alternates?.canonical).toContain("/historico");
    expect(meta.openGraph?.images?.[0]).toMatchObject({ url: "/og-default.svg" });
  });
  it("rootMetadata defines title template", () => {
    expect(rootMetadata.title).toMatchObject({ template: expect.stringContaining(siteConfig.name) });
  });
});
