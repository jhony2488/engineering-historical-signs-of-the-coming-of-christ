import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Simulador de Cenários",
  description:
    "What-if local com árvore de dependências macro/micro. Explore combinações de sinais e impacto projetado no índice global.",
  path: "/simulador",
  keywords: ["simulador escatológico", "cenários proféticos", "árvore dependências", "what-if"],
});

export default function SimuladorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
