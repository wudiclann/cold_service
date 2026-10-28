interface TabOption<T extends string> {
  value: T;
  label: string;
  count?: number;
  /** Colour the count red: this queue needs attention. */
  alert?: boolean;
}

/** Underline tabs on a full-width 1px rule; scrolls sideways inside its own row. */
export function Tabs<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={`flex gap-3.5 sm:gap-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-edge ${className}`}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`shrink-0 h-10 -mb-px text-[13px] sm:text-sm cursor-pointer border-b-2 transition-colors ${
              active
                ? "border-accent text-ink font-medium"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span
                className={`ml-1 sm:ml-1.5 text-xs tabular-nums ${
                  opt.alert ? "font-medium text-negative" : "font-normal text-muted"
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
