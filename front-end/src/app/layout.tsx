import type { Metadata, Viewport } from "next";

import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { BackgroundAudio } from "@/components/audio/BackgroundAudio";
import { SplineCompanionLoader } from "@/components/spline/SplineCompanionLoader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { rootMetadata, siteConfig } from "@/lib/seo/metadata";
import "./globals.css";

export const metadata: Metadata = {
  ...rootMetadata,
  manifest: "/site.webmanifest",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/favicon.svg" }],
  },
  applicationName: siteConfig.name,
  appleWebApp: {
    capable: true,
    title: siteConfig.name,
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0c10" },
    { media: "(prefers-color-scheme: light)", color: "#11141c" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased">
        <a href="#main-content" className="skip-link">
          Ir para o conteúdo principal
        </a>
        <video
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 h-full w-full object-cover opacity-15"
          src="/cardume.mp4"
        />
        <div className="relative z-10">
          <GoogleAnalytics />
          <BackgroundAudio />
          <SplineCompanionLoader />
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
