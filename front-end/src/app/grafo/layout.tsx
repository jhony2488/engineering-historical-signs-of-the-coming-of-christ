import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Grafo Profético",
  description: "Visualização interativa de nós e cenários escatológicos.",
};

export default function GrafoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
