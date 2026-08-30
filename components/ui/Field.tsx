import type { ReactNode } from "react";

export function Field({
  label,
  className = "",
  children,
}: {
  label: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block text-[11px] text-black/60 mb-1">{label}</label>
      {children}
    </div>
  );
}
