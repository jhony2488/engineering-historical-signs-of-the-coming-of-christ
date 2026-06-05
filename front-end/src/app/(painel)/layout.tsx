import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Painel — Monitor em Tempo Real",
  description:
    "Dashboard escatológico com fases I–IV, medidor de proximidade espiritual, energias de expansão e contração, alerta de falso líder, scores das bestas e transição entre eras. Dados atualizados diariamente pelo motor de IA.",
  path: "/",
  keywords: [
    "painel escatológico",
    "fase profética",
    "medidor proximidade espiritual",
    "falso líder",
    "besta do mar",
    "transição entre fases",
    "sinais históricos",
  ],
});

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Monitor Escatológico",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description:
              "Sistema de engenharia de sinais históricos para monitoramento analítico de fases escatológicas.",
            offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
          }),
        }}
      />
      {children}
    </>
  );
}
