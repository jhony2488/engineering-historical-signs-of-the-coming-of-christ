"use client";

interface ChipOption<T extends string> {
  id: T;
  label: string;
}

interface ChipGroupProps<T extends string> {
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}

export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  ariaLabel = "Filtros",
}: ChipGroupProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex flex-wrap gap-2 animate-fade-in"
      style={{ animationDelay: "80ms" }}
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={value === opt.id ? "chip-active" : "chip-inactive"}
          aria-pressed={value === opt.id}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
