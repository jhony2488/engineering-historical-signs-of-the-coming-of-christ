import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Revisão Humana",
  robots: { index: false, follow: false },
};

export default function RevisaoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
