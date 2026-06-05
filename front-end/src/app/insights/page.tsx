"use client";

import { InsightsDashboard } from "@/components/analytics/InsightsDashboard";
import { Header } from "@/components/ui/Header";
import { PageShell } from "@/components/ui/PageShell";

export default function InsightsPage() {
  return (
    <div className="min-h-screen bg-ink-950">
      <Header variant="admin" />
      <PageShell
        badge="Área restrita"
        title="Insights de Analytics"
        subtitle="Métricas das páginas públicas via Google Analytics 4 (gratuito). Rastreamento ativo apenas em Painel e Rankings."
      >
        <InsightsDashboard />
      </PageShell>
    </div>
  );
}
