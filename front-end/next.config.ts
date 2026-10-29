import type { NextConfig } from "next";

const isTauriBuild = process.env.TAURI_BUILD === "true";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // jsdom (via isomorphic-dompurify) lê browser/default-stylesheet.css por fs —
  // bundlar no webpack quebra o path no prerender SSR; manter externo.
  serverExternalPackages: ["isomorphic-dompurify", "jsdom"],

  // Configuração para Tauri (SSG) - usa export quando TAURI_BUILD=true
  ...(isTauriBuild && {
    output: "export",
    images: {
      unoptimized: true,
    },
    assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || "",
  }),
};

export default nextConfig;
