import { LogoutButton } from "./LogoutButton";
import { NavLinks } from "./NavLinks";

interface HeaderProps {
  dataReferencia?: string;
  fromCache?: boolean;
  isMock?: boolean;
  dataSource?: "db" | "fastapi";
  /** public: visitante (só leitura). admin: área restrita autenticada. */
  variant?: "public" | "admin";
}

const PUBLIC_LINKS = [
  { href: "/", label: "Painel" },
  { href: "/profecias", label: "Profecias" },
  { href: "/rankings", label: "Rankings" },
] as const;

const ADMIN_LINKS = [
  { href: "/historico", label: "Histórico" },
  { href: "/simulador", label: "Simulador" },
  { href: "/grafo", label: "Grafo" },
  { href: "/revisao", label: "Revisão" },
  { href: "/insights", label: "Insights" },
] as const;

export function Header({
  dataReferencia,
  fromCache,
  isMock,
  dataSource,
  variant = "public",
}: HeaderProps) {
  const links = variant === "admin" ? [...PUBLIC_LINKS, ...ADMIN_LINKS] : PUBLIC_LINKS;

  return (
    <header
      role="banner"
      className="header-shell sticky top-0 z-50 border-b border-ink-700/60 bg-ink-950/80 backdrop-blur-xl transition-all duration-300"
    >
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="group relative">
            <span className="header-orbit header-orbit-cyan" aria-hidden="true" />
            <span className="header-orbit header-orbit-gold" aria-hidden="true" />
            <p className="text-xs uppercase tracking-[0.2em] text-gold-400/80 transition-colors group-hover:text-gold-300">
              Engenharia de Sinais Históricos
            </p>
            <h1 className="font-display text-xl sm:text-2xl text-white mt-0.5 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-gold-100">
              Monitor Escatológico
            </h1>
          </div>
          <nav className="header-nav flex flex-wrap items-center gap-3 text-sm" aria-label="Navegação principal">
            <NavLinks links={links} />
            {variant === "admin" && <LogoutButton />}
            {dataReferencia && (
              <span
                className="header-meta text-xs text-slate-500 border-l border-ink-700 pl-4 transition-colors hover:text-slate-300"
                aria-label={`Data de referência ${dataReferencia}${fromCache ? ", dados em cache" : ""}${isMock ? ", modo demonstração" : ""}${dataSource ? `, fonte ${dataSource}` : ""}`}
              >
                Ref: {dataReferencia}
                {fromCache && " · cache"}
                {isMock && " · demo"}
                {dataSource && ` · ${dataSource}`}
              </span>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
