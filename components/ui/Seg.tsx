interface SegOption<T extends string> {
  value: T;
  label: string;
}

export function Seg<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: SegOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={`inline-flex border border-divider rounded-none overflow-hidden ${className}`}>
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 px-3 py-1.5 text-[13px] font-heading font-semibold text-center cursor-pointer ${
              i > 0 ? "border-l border-divider" : ""
            } ${active ? "bg-accent text-bg" : "text-ink hover:bg-black/5"}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
