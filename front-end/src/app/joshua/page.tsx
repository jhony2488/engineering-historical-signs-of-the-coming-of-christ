"use client";

import { useCallback, useEffect, useState } from "react";

import { Header } from "@/components/ui/Header";
import { LoadingDots } from "@/components/ui/LoadingDots";
import { PageShell } from "@/components/ui/PageShell";

interface JoshuaRow {
  people_id: string;
  people_name: string;
  country_code: string;
  country_name: string;
  population: number | null;
  joshua_scale: number | null;
  primary_language: string | null;
  bible_translation_status: string | null;
  percent_christian: number | null;
  percent_evangelical: number | null;
}

export default function JoshuaPage() {
  const [rows, setRows] = useState<JoshuaRow[]>([]);
  const [country, setCountry] = useState("");
  const [scale, setScale] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (country.trim()) params.set("country", country.trim().toUpperCase());
      if (scale) params.set("scale", scale);
      params.set("limit", "100");
      const res = await fetch(`/api/joshua/data?${params.toString()}`);
      if (!res.ok) throw new Error("Falha ao carregar dados");
      const data = (await res.json()) as JoshuaRow[];
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [country, scale]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <Header variant="public" />
      <PageShell
        badge="Joshua Project"
        title="Povos e progresso missiológico"
        subtitle="Dados normalizados da API Joshua Project (BFF). Use filtros por país (ISO-3) e escala 1–5."
      >
        <form
          className="mb-6 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void load();
          }}
        >
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            País (ISO-3)
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="BRA"
              maxLength={3}
              className="rounded border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-slate-200"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Escala Joshua
            <select
              value={scale}
              onChange={(e) => setScale(e.target.value)}
              className="rounded border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-slate-200"
            >
              <option value="">Todas</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded border border-gold-500/40 bg-gold-500/10 px-4 py-2 text-sm text-gold-200 hover:bg-gold-500/20"
          >
            Filtrar
          </button>
        </form>

        {loading ? (
          <LoadingDots label="Carregando Joshua Project" />
        ) : error ? (
          <p className="text-sm text-amber-300">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhum registro. Execute o sync (`/api/joshua/sync`) ou verifique o banco.
          </p>
        ) : (
          <div className="overflow-x-auto rounded border border-ink-700/60">
            <table className="min-w-full text-left text-sm text-slate-300">
              <thead className="border-b border-ink-700/60 bg-ink-900/60 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2">Povo</th>
                  <th className="px-3 py-2">País</th>
                  <th className="px-3 py-2">Pop.</th>
                  <th className="px-3 py-2">Escala</th>
                  <th className="px-3 py-2">Língua</th>
                  <th className="px-3 py-2">Bíblia</th>
                  <th className="px-3 py-2">% cristão</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.people_id} className="border-b border-ink-800/80">
                    <td className="px-3 py-2 text-slate-100">{r.people_name}</td>
                    <td className="px-3 py-2">
                      {r.country_code}
                      <span className="ml-1 text-slate-500">{r.country_name}</span>
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {r.population?.toLocaleString("pt-BR") ?? "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{r.joshua_scale ?? "—"}</td>
                    <td className="px-3 py-2">{r.primary_language ?? "—"}</td>
                    <td className="px-3 py-2">{r.bible_translation_status ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {r.percent_christian != null
                        ? `${(r.percent_christian * (r.percent_christian <= 1 ? 100 : 1)).toFixed(1)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageShell>
    </>
  );
}
