"use client";

interface ChipOption<T extends string> {
  id: T;
  label: string;
}

interface ChipGroupProps<T extends string> {
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function ChipGroup<T extends string>({ options, value, onChange }: ChipGroupProps<T>) {
  return (
    <div className="flex flex-wrap gap-2 animate-fade-in" style={{ animationDelay: "80ms" }}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={value === opt.id ? "chip-active" : "chip-inactive"}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
