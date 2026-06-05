import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Arquivo Cronológico e Histórico",
  description:
    "Série temporal da convicção escatológica com janelas semanal, mensal, trimestral e anual. Evolução do índice global, transições entre fases e registro append-only dos processamentos batch do motor de IA.",
  path: "/historico",
  keywords: [
    "histórico escatológico",
    "arquivo cronológico",
    "evolução convicção",
    "janela temporal",
    "série temporal profética",
    "transição fases",
  ],
});

export default function HistoricoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: "Histórico de Resultados Escatológicos",
            description:
              "Registro temporal de índices, fases e transições processados pelo motor diário.",
            temporalCoverage: "2026/..",
            inLanguage: "pt-BR",
          }),
        }}
      />
      {children}
    </>
  );
}
