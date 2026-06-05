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
  return (
    <main className={`page-main ${className}`}>
      <header className="page-hero flex flex-wrap items-start justify-between gap-4">
        <div className="relative z-10">
          {badge && (
            <p className="text-xs uppercase tracking-[0.2em] text-gold-400/80 mb-2">{badge}</p>
          )}
          <h2 className="page-title">{title}</h2>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="relative z-10 flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      {children}
    </main>
  );
}
