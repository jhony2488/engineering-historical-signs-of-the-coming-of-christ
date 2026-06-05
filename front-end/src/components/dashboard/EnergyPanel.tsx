import type { EventoEstruturado } from "@/lib/types";

interface EnergyPanelProps {
  eventos: EventoEstruturado[];
  expansaoRatio?: number;
}

export function EnergyPanel({ eventos, expansaoRatio }: EnergyPanelProps) {
  const expansao = eventos.filter((e) => e.energia === "expansao").length;
  const contracao = eventos.filter((e) => e.energia === "contracao").length;
  const totalEvents = eventos.length;
  const total = totalEvents || 1;
  const expPct = expansaoRatio ?? (totalEvents === 0 ? 0 : expansao / total);
  const conPct =
    expansaoRatio != null ? 1 - expPct : totalEvents === 0 ? 1 : contracao / total;

  return (
    <div className="card-interactive">
      <h2 className="card-title">Energias — Discernimento</h2>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-emerald-400">Expansão (Luz)</span>
            <span className="tabular-nums">{(expPct * 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded-full bg-ink-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500/70 transition-all"
              style={{ width: `${expPct * 100}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-red-400">Contração (Sombra)</span>
            <span className="tabular-nums">{(conPct * 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded-full bg-ink-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-red-500/70 transition-all"
              style={{ width: `${conPct * 100}%` }}
            />
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-4 leading-relaxed">
        Expansão: evangelização, despertamento, caridade. Contração: perseguição, engano, totalitarismo.
      </p>
    </div>
  );
}
