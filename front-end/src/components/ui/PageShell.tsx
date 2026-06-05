import type { ReactNode } from "react";

interface PageShellProps {
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PageShell({
  title,
  subtitle,
  badge,
  actions,
  children,
  className = "",
}: PageShellProps) {
  const headingId = "page-shell-heading";

  return (
    <main id="main-content" className={`page-main ${className}`} aria-labelledby={headingId}>
      <header className="page-hero page-hero-ornate flex flex-wrap items-start justify-between gap-4">
        <span className="pointer-events-none absolute -left-8 -top-10 h-28 w-28 rounded-full bg-signal-phase/10 blur-3xl" aria-hidden="true" />
        <span className="pointer-events-none absolute right-8 top-2 h-24 w-24 rounded-full bg-gold-400/10 blur-3xl" aria-hidden="true" />
        <div className="relative z-10">
          {badge && (
            <p className="text-xs uppercase tracking-[0.2em] text-gold-400/80 mb-2">{badge}</p>
          )}
          <h2 id={headingId} className="page-title">{title}</h2>
          {subtitle && <p className="page-subtitle" id={`${headingId}-desc`}>{subtitle}</p>}
        </div>
        {actions && <div className="relative z-10 flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      {children}
    </main>
  );
}
