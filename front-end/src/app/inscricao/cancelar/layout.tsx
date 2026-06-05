import type { Metadata } from "next";

import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Cancelar inscrição",
  description: "Descadastre-se dos avisos de atualizações diárias do painel escatológico.",
  path: "/inscricao/cancelar",
  noIndex: true,
});

export default function CancelarInscricaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
