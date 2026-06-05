import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acesso restrito",
  robots: { index: false, follow: false, nocache: true },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
