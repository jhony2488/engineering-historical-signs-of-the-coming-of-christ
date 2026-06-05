import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Rankings Probabilísticos — Top 10",
  description:
    "Lista probabilística PAP dos candidatos à Besta do Mar (Anticristo) e Besta da Terra (Falso Profeta). Ranking MCDA atualizado no batch noturno com tendência 24h e fator principal de impacto.",
  path: "/rankings",
  keywords: [
    "ranking probabilístico",
    "PAP",
    "besta do mar",
    "besta da terra",
    "anticristo análise",
    "falso profeta",
    "MCDA escatológico",
  ],
});

export default function RankingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Rankings Probabilísticos Escatológicos",
            description: "Top 10 candidatos por personagem profético com PAP diário.",
            itemListOrder: "https://schema.org/ItemListOrderDescending",
          }),
        }}
      />
      {children}
    </>
  );
}
