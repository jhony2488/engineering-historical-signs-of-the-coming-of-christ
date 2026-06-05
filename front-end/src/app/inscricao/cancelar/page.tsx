"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type UnsubscribeState = "idle" | "loading" | "success" | "error" | "missing";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [state, setState] = useState<UnsubscribeState>(token ? "idle" : "missing");

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setState("loading");

    fetch("/api/db/newsletter/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) {
          setState("success");
          return;
        }
        setState("error");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main
      id="main-content"
      className="relative flex min-h-screen items-center justify-center px-4 py-16"
      aria-labelledby="unsubscribe-title"
    >
      <div className="card-glow card-interactive w-full max-w-lg p-8 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-gold-400/90">E-mail marketing</p>
        <h1 id="unsubscribe-title" className="mt-3 font-display text-2xl text-white">
          Cancelar inscrição
        </h1>

        {state === "loading" && (
          <p className="mt-4 text-sm text-slate-400" role="status">
            Processando seu pedido de descadastro...
          </p>
        )}

        {state === "success" && (
          <p className="mt-4 text-sm text-emerald-300" role="status">
            Sua inscrição foi cancelada. Você não receberá mais avisos de atualizações diárias.
          </p>
        )}

        {state === "error" && (
          <p className="mt-4 text-sm text-rose-300" role="alert">
            Não foi possível validar o link de descadastro. Ele pode estar inválido ou já ter sido
            usado.
          </p>
        )}

        {state === "missing" && (
          <p className="mt-4 text-sm text-slate-400" role="alert">
            Link incompleto. Use o botão de descadastro enviado no seu e-mail.
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="btn-primary">
            Voltar ao painel
          </Link>
          <Link href="/profecias" className="btn-ghost">
            Ver profecias
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function CancelarInscricaoPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center px-4 py-16">
          <p className="text-sm text-slate-400">Carregando...</p>
        </main>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
