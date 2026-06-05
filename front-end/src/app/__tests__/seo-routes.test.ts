import { describe, expect, it } from "vitest";

import sitemap from "@/app/sitemap";

import robots from "@/app/robots";



describe("seo routes", () => {

  it("sitemap includes only public routes", () => {

    const entries = sitemap();

    const urls = entries.map((e) => e.url);

    expect(urls.some((u) => u.endsWith("/rankings"))).toBe(true);

    expect(urls.some((u) => u.endsWith("/historico"))).toBe(false);

    expect(urls.some((u) => u.endsWith("/simulador"))).toBe(false);

    expect(urls.some((u) => u.endsWith("/login"))).toBe(false);

  });



  it("robots blocks api and admin area", () => {

    const r = robots();

    expect(r.rules).toMatchObject({

      disallow: ["/api/", "/login", "/historico", "/simulador", "/grafo", "/insights", "/revisao"],

    });

    expect(r.sitemap).toContain("sitemap.xml");

  });

});

