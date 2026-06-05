import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const SITE_NAME = "Engenharia de Sinais Históricos";
const DEFAULT_DESCRIPTION =
  "Monitor escatológico analítico — tradução de sinais históricos, fases proféticas, transições entre eras e rankings probabilísticos. Não é predição de datas.";

export const siteConfig = {
  name: SITE_NAME,
  url: SITE_URL,
  locale: "pt_BR",
  twitterHandle: "@sinais_historicos",
};

interface PageSeoOptions {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  noIndex?: boolean;
}

export function buildPageMetadata(options: PageSeoOptions): Metadata {
  const url = `${siteConfig.url}${options.path}`;
  const fullTitle = `${options.title} | ${siteConfig.name}`;

  return {
    title: options.title,
    description: options.description,
    keywords: options.keywords ?? [
      "escatologia",
      "sinais históricos",
      "profecia bíblica",
      "análise geopolítica",
      "fases escatológicas",
      "engenharia de sinais",
    ],
    authors: [{ name: siteConfig.name }],
    creator: siteConfig.name,
    publisher: siteConfig.name,
    metadataBase: new URL(siteConfig.url),
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: siteConfig.locale,
      url,
      siteName: siteConfig.name,
      title: fullTitle,
      description: options.description,
      images: [
        {
          url: "/og-default.svg",
          width: 1200,
          height: 630,
          alt: siteConfig.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: options.description,
      images: ["/og-default.svg"],
      creator: siteConfig.twitterHandle,
    },
    robots: options.noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
    category: "technology",
  };
}

export const rootMetadata: Metadata = {
  ...buildPageMetadata({
    title: "Monitor Escatológico",
    description: DEFAULT_DESCRIPTION,
    path: "/",
  }),
  title: {
    default: `${siteConfig.name} — Monitor Escatológico`,
    template: `%s | ${siteConfig.name}`,
  },
};
