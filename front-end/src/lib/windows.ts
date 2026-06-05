import type { JanelaTemporal } from "@/lib/types";

export const WINDOW_DAYS: Record<JanelaTemporal, number> = {
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  semiannual: 180,
  annual: 365,
};

/** Janela do Motor Nível 2 em `snapshots_periodo`. */
export function snapshotJanelaNivel2(window: JanelaTemporal): string {
  return window;
}

/** Janela híbrida do Motor Nível 3 (quando existir). */
export function snapshotJanelaHibrida(window: JanelaTemporal): string | null {
  if (window === "quarterly") return "quarterly_hybrid";
  if (window === "semiannual") return "semiannual_hybrid";
  if (window === "annual") return "annual_hybrid";
  return null;
}

export const JANELAS_UI: { id: JanelaTemporal; label: string; motor: string }[] = [
  { id: "weekly", label: "Semanal", motor: "Nível 2 — Tática" },
  { id: "monthly", label: "Mensal", motor: "Nível 2 — Estratégica" },
  { id: "quarterly", label: "Trimestral", motor: "Nível 2/3 — Ciclos" },
  { id: "semiannual", label: "Semestral", motor: "Nível 2/3 — Ciclos" },
  { id: "annual", label: "Anual", motor: "Nível 2/3 — Panorama" },
];
