import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // jsdom (via isomorphic-dompurify) lê browser/default-stylesheet.css por fs —
  // bundlar no webpack quebra o path no prerender SSR; manter externo.
  serverExternalPackages: ["isomorphic-dompurify", "jsdom"],
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${backendUrl.replace(/\/$/, "")}/:path*`,
      },
    ];
  },
};

export default nextConfig;
