"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-red-900/50 bg-red-950/20 p-8 text-center">
          <h2 className="mb-2 text-lg font-semibold text-red-400">
            Algo deu errado ao carregar esta página
          </h2>
          <p className="mb-4 text-sm text-slate-400">
            {this.state.error?.message || "Erro desconhecido"}
          </p>
          <details className="mb-4 text-left text-xs text-slate-500">
            <summary className="cursor-pointer text-slate-400 hover:text-slate-300">
              Detalhes técnicos
            </summary>
            <pre className="mt-2 overflow-auto rounded bg-ink-900/50 p-3">
              {this.state.error?.stack || "Sem stack trace"}
            </pre>
          </details>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded border border-ink-600 px-4 py-2 text-sm text-slate-300 hover:border-cyan-500/50 hover:text-cyan-200"
          >
            Recarregar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
