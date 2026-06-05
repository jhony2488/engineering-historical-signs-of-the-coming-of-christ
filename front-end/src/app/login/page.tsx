"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, Suspense } from "react";
import { safeRedirectPath } from "@/lib/auth/constants";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "same-origin",
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Credenciais inválidas.");
        return;
      }

      const from = safeRedirectPath(searchParams.get("from"));
      router.replace(from);
      router.refresh();
    } catch {
      setError("Não foi possível autenticar. Tente novamente.");
    } finally {
      setLoading(false);
      setPassword("");
    }
  }

  return (
    <main id="main-content" className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16" aria-labelledby="login-title">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        aria-hidden
      >
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-signal-phase/10 blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-gold-400/5 blur-3xl" />
      </div>

      <div className="card-glow card-interactive relative z-10 w-full max-w-md animate-fade-in-up p-7 sm:p-8">
        <div className="mb-8 text-center sm:text-left">
          <p className="text-xs uppercase tracking-[0.25em] text-gold-400/90">Acesso restrito</p>
          <h1 id="login-title" className="mt-3 font-display text-2xl text-white">Área administrativa</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Histórico, simulador e grafo exigem autenticação.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off" aria-label="Formulário de login administrativo">
          <div className="space-y-1.5">
            <label htmlFor="username" className="block text-xs font-medium text-slate-400">
              Usuário
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-xs font-medium text-slate-400">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
            />
          </div>

          {error && (
            <p
              className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300 animate-fade-in"
              role="alert"
            >
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} aria-busy={loading} className="btn-primary w-full">
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main id="main-content" className="flex min-h-screen items-center justify-center">
          <p className="text-slate-500 animate-pulse-soft" role="status" aria-live="polite">Carregando…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
