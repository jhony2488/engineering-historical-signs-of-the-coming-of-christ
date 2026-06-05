import type { RankingCandidato } from "@/lib/types";

interface RankingTableProps {
  title: string;
  subtitle: string;
  items: RankingCandidato[];
}

function TendenciaIcon({ value }: { value: number }) {
  if (value > 0.5) {
    return (
      <span className="text-red-400">
        <span aria-hidden="true">▲</span> +{value.toFixed(1)}%
        <span className="sr-only">Tendência de alta</span>
      </span>
    );
  }
  if (value < -0.5) {
    return (
      <span className="text-emerald-400">
        <span aria-hidden="true">▼</span> {value.toFixed(1)}%
        <span className="sr-only">Tendência de queda</span>
      </span>
    );
  }
  return (
    <span className="text-slate-500">
      <span aria-hidden="true">▬</span> Estável
    </span>
  );
}

export function RankingTable({ title, subtitle, items }: RankingTableProps) {
  const tableId = `ranking-${title.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <section className="card-interactive card-glow overflow-hidden" aria-labelledby={tableId}>
      <h2 id={tableId} className="card-title">{title}</h2>
      <p className="text-xs text-slate-500 mb-4" id={`${tableId}-desc`}>{subtitle}</p>
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-sm" aria-describedby={`${tableId}-desc`}>
          <caption className="sr-only">{title} — {subtitle}</caption>
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-ink-700">
              <th scope="col" className="pb-2 pr-3">#</th>
              <th scope="col" className="pb-2 pr-3">Candidato</th>
              <th scope="col" className="pb-2 pr-3 text-right">PAP</th>
              <th scope="col" className="pb-2 pr-3 text-right">24h</th>
              <th scope="col" className="pb-2 hidden sm:table-cell">Fator principal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.candidato_id} className="table-row-hover group last:border-0">
                <td className="py-3 pr-3 text-slate-500 tabular-nums">{item.posicao}º</td>
                <td className="py-3 pr-3 text-white font-medium transition-colors duration-200 group-hover:text-gold-100">
                  {item.nome}
                </td>
                <td className="py-3 pr-3 text-right tabular-nums text-gold-400 transition-all duration-200 group-hover:scale-[1.02]">
                  {item.probabilidade_atual.toFixed(1)}%
                </td>
                <td className="py-3 pr-3 text-right text-xs">
                  <TendenciaIcon value={item.tendencia_24h} />
                </td>
                <td className="py-3 text-xs text-slate-500 hidden sm:table-cell max-w-[200px] truncate transition-colors duration-200 group-hover:text-slate-300">
                  {item.fator_principal}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-500">
                  Nenhum candidato ranqueado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
