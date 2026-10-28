interface SegOption<T extends string> {
  value: T;
  label: string;
}

export function Seg<T extends string>({
  options,
  value,
  onChange,
  className = "",
  label,
}: {
  options: SegOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  label?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`inline-flex gap-0.5 p-0.5 bg-active rounded-lg ${className}`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`flex-1 h-7 px-3 text-sm rounded-md cursor-pointer transition-colors ${
              active
                ? "bg-surface text-ink font-medium border border-edge"
                : "border border-transparent text-muted hover:text-ink"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
