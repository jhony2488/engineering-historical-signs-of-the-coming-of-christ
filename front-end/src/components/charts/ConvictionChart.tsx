"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ResultadoEscatologico } from "@/lib/types";

interface ConvictionChartProps {
  historico: ResultadoEscatologico[];
}

export function ConvictionChart({ historico }: ConvictionChartProps) {
  const data = historico.map((h) => ({
    data: h.data_referencia.slice(5),
    indice: Math.round(h.indice_global * 100),
    confianca: Math.round(h.confianca * 100),
    fase: h.fase_atual.replace("FASE_", ""),
  }));

  return (
    <section className="card-interactive" aria-labelledby="conviction-chart-title">
      <h2 id="conviction-chart-title" className="card-title">Evolução da Convicção</h2>
      <div
        className="h-64 w-full"
        role="img"
        aria-label={`Gráfico de evolução da convicção com ${data.length} pontos. Índice e confiança ao longo do tempo.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#252b3d" />
            <XAxis dataKey="data" tick={{ fill: "#64748b", fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#11141c",
                border: "1px solid #252b3d",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#94a3b8" }}
            />
            <Line
              type="monotone"
              dataKey="indice"
              name="Índice %"
              stroke="#d4a853"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="confianca"
              name="Confiança %"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
