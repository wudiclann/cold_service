/** Cold Service mark: a six-armed frost crystal, drawn for the product. */
export function Mark({ size = 22, color = "var(--color-accent)" }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 2v20M3.34 7l17.32 10M3.34 17 20.66 7" />
      <path d="m9.5 3.8 2.5 2 2.5-2M9.5 20.2l2.5-2 2.5 2" />
    </svg>
  );
}

/** `inverted` is for the blue sidebar: white mark, white text. */
export function Brand({ className = "", inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Mark color={inverted ? "#ffffff" : undefined} />
      <div className="leading-tight">
        <div className={`text-sm font-semibold ${inverted ? "text-white" : ""}`}>Cold Service</div>
        <div className={`text-xs ${inverted ? "text-white/90" : "text-muted"}`}>Service operations</div>
      </div>
    </div>
  );
}
