import type { Metadata } from "next";

import Link from "next/link";

import { Header } from "@/components/ui/Header";



export const metadata: Metadata = {

  title: "Página não encontrada",

  description: "A rota solicitada não existe no Monitor Escatológico.",

  robots: { index: false, follow: false },

};



const ROTAS = [

  { href: "/", label: "Painel", desc: "Monitor em tempo real" },

  { href: "/profecias", label: "Profecias", desc: "Baseline histórico" },

  { href: "/rankings", label: "Rankings", desc: "Top-10 probabilístico" },

] as const;



export default function NotFound() {

  return (

    <>

      <Header />

      <main id="main-content" className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl flex-col items-center justify-center px-4 py-16 sm:px-6" aria-labelledby="not-found-title">

        <div className="card w-full max-w-lg text-center">

          <p className="text-6xl font-display font-semibold text-gold-400/90 tabular-nums">

            404

          </p>

          <h2 id="not-found-title" className="mt-4 text-xl font-semibold text-white">

            Sinal não mapeado

          </h2>

          <p className="mt-3 text-sm leading-relaxed text-slate-400">

            A página que você buscou não faz parte do arquivo público do sistema.

            Pode ter sido movida, removida ou o endereço está incorreto.

          </p>



          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">

            <Link

              href="/"

              className="inline-flex items-center justify-center rounded-lg bg-signal-phase/20 px-5 py-2.5 text-sm font-medium text-white border border-signal-phase/40 hover:bg-signal-phase/30 transition"

            >

              Voltar ao painel

            </Link>

            <Link

              href="/rankings"

              className="inline-flex items-center justify-center rounded-lg border border-ink-700 px-5 py-2.5 text-sm text-slate-300 hover:text-white hover:border-ink-600 transition"

            >

              Ver rankings

            </Link>

          </div>

        </div>



        <nav

          className="mt-10 grid w-full max-w-lg gap-3 sm:grid-cols-2"

          aria-label="Rotas públicas"

        >

          {ROTAS.map((rota) => (

            <Link

              key={rota.href}

              href={rota.href}

              className="rounded-lg border border-ink-700/80 bg-ink-900 px-4 py-3 text-center hover:border-ink-600 hover:bg-ink-900 transition"

            >

              <span className="block text-sm font-medium text-white">{rota.label}</span>

              <span className="mt-1 block text-xs text-slate-500">{rota.desc}</span>

            </Link>

          ))}

        </nav>

      </main>

    </>

  );

}

