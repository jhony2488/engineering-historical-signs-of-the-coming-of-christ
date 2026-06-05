import { VirtualList } from "@/components/ui/VirtualList";
import type { EventoEstruturado } from "@/lib/types";

interface EventsListProps {
  eventos: EventoEstruturado[];
}

function EventoItem({ ev }: { ev: EventoEstruturado }) {
  return (
    <div className="rounded-lg border border-ink-700/60 bg-ink-800/30 p-3 h-full">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className="text-sm font-medium text-white">{ev.evento.replace(/_/g, " ")}</span>
        <span className="text-xs text-slate-500">{ev.regiao}</span>
        <span className={ev.energia === "expansao" ? "badge-expansao" : "badge-contracao"}>
          {ev.energia}
        </span>
        <span className="text-xs text-slate-600 uppercase">{ev.dimensao}</span>
      </div>
      {ev.descricao && <p className="text-xs text-slate-400">{ev.descricao}</p>}
      <div className="flex gap-4 mt-2 text-xs text-slate-500 tabular-nums">
        <span>Tensão: {(ev.grau_tensao * 100).toFixed(0)}%</span>
        <span>Impacto: {(ev.impacto_global * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

export function EventsList({ eventos }: EventsListProps) {
  const useVirtual = eventos.length > 12;

  return (
    <div className="card-interactive">
      <h2 className="card-title">Arquivo Cronológico — Últimas 24h</h2>
      {eventos.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">Nenhum evento processado</p>
      ) : useVirtual ? (
        <VirtualList
          items={eventos}
          itemHeight={108}
          height={420}
          className="mt-3"
          renderItem={(ev) => <EventoItem ev={ev} />}
        />
      ) : (
        <ul className="space-y-3">
          {eventos.map((ev, i) => (
            <li key={`${ev.evento}-${i}`}>
              <EventoItem ev={ev} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
