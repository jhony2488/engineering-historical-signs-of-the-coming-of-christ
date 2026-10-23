import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // jsdom (via isomorphic-dompurify) lê browser/default-stylesheet.css por fs —
  // bundlar no webpack quebra o path no prerender SSR; manter externo.
  serverExternalPackages: ["isomorphic-dompurify", "jsdom"],
};

export default nextConfig;
