"use client";

import { useCallback, useEffect, useState } from "react";

import { Header } from "@/components/ui/Header";
import { LoadingDots } from "@/components/ui/LoadingDots";
import { PageShell } from "@/components/ui/PageShell";

type Subscriber = {
  email: string;
  source: string | null;
  subscribed_at: string;
};

type NewsletterData = {
  stats: { active: number; unsubscribed: number };
  subscribers: Subscriber[];
};

type SendResult = {
  sent: number;
  failed: number;
  dryRun: boolean;
  total: number;
};

export default function NewsletterPage() {
  const [data, setData] = useState<NewsletterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/newsletter/subscribers", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as NewsletterData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    if (!subject.trim() || !body.trim()) return;

    const confirmed = window.confirm(
      `Enviar para ${data?.stats.active ?? 0} inscritos ativos? Esta ação não pode ser desfeita.`,
    );
    if (!confirmed) return;

    setSending(true);
    setError(null);
    setSendResult(null);
    try {
      const res = await fetch("/api/admin/newsletter/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const payload = (await res.json()) as SendResult & { error?: string };
      if (!res.ok) throw new Error(payload.error ?? `HTTP ${res.status}`);
      setSendResult(payload);
      setSubject("");
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <Header variant="admin" />
      <PageShell
        badge="Comunicação"
        title="Newsletter"
        subtitle="Captura pública via formulário do site; disparos em massa pela área interna. O digest diário automático é enviado pelo motor Python ao final do processamento."
      >
        {loading && (
          <div className="flex items-center gap-2 text-slate-400">
            <LoadingDots />
            Carregando inscritos…
          </div>
        )}

        {error && (
          <p className="text-rose-300 text-sm" role="alert" aria-live="assertive">
            {error}
          </p>
        )}

        {data && (
          <div className="grid gap-8 lg:grid-cols-2">
            <section className="rounded-xl border border-ink-700/60 bg-ink-900/40 p-5">
              <h2 className="font-display text-lg text-white mb-4">Inscritos</h2>
              <dl className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <dt className="text-slate-500">Ativos</dt>
                  <dd className="text-2xl text-gold-300">{data.stats.active}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Cancelados</dt>
                  <dd className="text-2xl text-slate-300">{data.stats.unsubscribed}</dd>
                </div>
              </dl>
              <ul className="max-h-64 overflow-y-auto space-y-2 text-sm text-slate-300">
                {data.subscribers.map((sub) => (
                  <li
                    key={sub.email}
                    className="flex justify-between gap-2 border-b border-ink-800/80 pb-2"
                  >
                    <span>{sub.email}</span>
                    <span className="text-slate-500 shrink-0">{sub.source ?? "web"}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-ink-700/60 bg-ink-900/40 p-5">
              <h2 className="font-display text-lg text-white mb-4">Disparo em massa</h2>
              <form onSubmit={handleSend} className="space-y-4">
                <div>
                  <label htmlFor="newsletter-subject" className="block text-sm text-slate-400 mb-1">
                    Assunto
                  </label>
                  <input
                    id="newsletter-subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    maxLength={200}
                    required
                    className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-white"
                    placeholder="Título do e-mail"
                  />
                </div>
                <div>
                  <label htmlFor="newsletter-body" className="block text-sm text-slate-400 mb-1">
                    Mensagem
                  </label>
                  <textarea
                    id="newsletter-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={10}
                    required
                    className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-white resize-y"
                    placeholder="Corpo do e-mail (texto simples)"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Cada e-mail inclui link de descadastro automaticamente. Sem RESEND_API_KEY, o envio
                  roda em modo simulado (dry-run).
                </p>
                <button
                  type="submit"
                  disabled={sending || data.stats.active === 0}
                  className="rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-ink-950 disabled:opacity-50"
                >
                  {sending ? "Enviando…" : `Enviar para ${data.stats.active} inscritos`}
                </button>
              </form>

              {sendResult && (
                <p className="mt-4 text-sm text-emerald-300" role="status" aria-live="polite">
                  {sendResult.dryRun ? "Simulado (dry-run): " : ""}
                  {sendResult.sent} enviados, {sendResult.failed} falhas (total {sendResult.total}).
                </p>
              )}
            </section>
          </div>
        )}
      </PageShell>
    </div>
  );
}
