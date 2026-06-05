interface LoadingDotsProps {
  label?: string;
}

export function LoadingDots({ label = "Carregando" }: LoadingDotsProps) {
  return (
    <p
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex items-center gap-2 text-sm text-slate-500 animate-fade-in"
    >
      <span>{label}</span>
      <span className="loading-dots inline-flex gap-1" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </p>
  );
}
