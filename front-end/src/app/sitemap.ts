import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/seo/metadata";

/** Apenas rotas públicas de leitura — área admin não indexada. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;
  const now = new Date();

  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${base}/rankings`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];
}
