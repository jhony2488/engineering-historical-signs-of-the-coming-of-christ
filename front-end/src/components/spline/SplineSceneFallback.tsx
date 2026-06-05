import { LoadingDots } from "@/components/ui/LoadingDots";

export function SplineSceneFallback() {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center rounded-3xl border border-ink-700/40 bg-ink-900/40 backdrop-blur-sm"
      aria-hidden
    >
      <LoadingDots />
      <p className="mt-3 text-xs text-slate-500">Carregando cena…</p>
    </div>
  );
}
