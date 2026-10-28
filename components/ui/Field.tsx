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
    <label className={`block ${className}`}>
      <span className="block text-sm font-medium mb-1.5">{label}</span>
      {children}
    </label>
  );
}
