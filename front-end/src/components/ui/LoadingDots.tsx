interface LoadingDotsProps {
  label?: string;
}

export function LoadingDots({ label = "Carregando" }: LoadingDotsProps) {
  return (
    <p className="flex items-center gap-2 text-sm text-slate-500 animate-fade-in">
      <span>{label}</span>
      <span className="loading-dots inline-flex gap-1" aria-hidden>
        <span />
        <span />
        <span />
      </span>
    </p>
  );
}
