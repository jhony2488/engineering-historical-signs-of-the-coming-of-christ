import { Header } from "@/components/ui/Header";

export default function OfflinePage() {
  return (
    <>
      <Header isMock={false} fromCache={false} />
      <main id="main-content" className="page-main relative">
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="max-w-md text-center">
            <div className="mb-6 text-6xl">📡</div>
            <h1 className="mb-4 text-2xl font-display font-medium text-white">
              Você está offline
            </h1>
            <div className="mb-6 inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
              Aguardando conexão...
            </div>
            <p className="mb-6 text-sm text-slate-400">
              Sem conexão com a internet no momento. Os dados do dia que você já visitou
              podem estar disponíveis em cache.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-gold-600 px-6 py-2.5 text-sm font-medium text-ink-950 transition-colors hover:bg-gold-500"
            >
              Tentar reconectar
            </button>
            <div className="mt-8 rounded-lg border border-ink-700/50 bg-ink-900/40 p-4 text-left">
              <h3 className="mb-3 text-xs uppercase tracking-wider text-slate-500">
                O que fazer agora?
              </h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>• Verifique sua conexão de rede</li>
                <li>• Dados recentes podem estar acessíveis via cache</li>
                <li>• As notificações push funcionarão quando voltar online</li>
                <li>• O app sincronizará automaticamente ao reconectar</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
