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
  const conPct = expansaoRatio != null ? 1 - expPct : totalEvents === 0 ? 1 : contracao / total;
  const expRounded = Math.round(expPct * 100);
  const conRounded = Math.round(conPct * 100);

  return (
    <section className="card-interactive" aria-labelledby="energy-panel-title">
      <h2 id="energy-panel-title" className="card-title">
        Energias — Discernimento
      </h2>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span id="energy-expansao-label" className="text-emerald-400">
              Expansão (Luz)
            </span>
            <span className="tabular-nums">{expRounded}%</span>
          </div>
          <div
            className="h-2 rounded-full bg-ink-800 overflow-hidden"
            role="progressbar"
            aria-valuenow={expRounded}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-labelledby="energy-expansao-label"
          >
            <div
              className="h-full rounded-full bg-emerald-500/70 transition-all"
              style={{ width: `${expPct * 100}%` }}
              aria-hidden="true"
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span id="energy-contracao-label" className="text-red-400">
              Contração (Sombra)
            </span>
            <span className="tabular-nums">{conRounded}%</span>
          </div>
          <div
            className="h-2 rounded-full bg-ink-800 overflow-hidden"
            role="progressbar"
            aria-valuenow={conRounded}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-labelledby="energy-contracao-label"
          >
            <div
              className="h-full rounded-full bg-red-500/70 transition-all"
              style={{ width: `${conPct * 100}%` }}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-4 leading-relaxed">
        Expansão: evangelização, despertamento, caridade. Contração: perseguição, engano, totalitarismo.
      </p>
    </section>
  );
}
