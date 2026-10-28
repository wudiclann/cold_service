import type { HTMLAttributes, ReactNode } from "react";

export function Card({ className = "", children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`bg-surface border border-edge rounded-lg ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  note,
  right,
  className = "",
}: {
  title: string;
  note?: string;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-3 px-5 pt-4 pb-3 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-base">{title}</h2>
        {note && <p className="text-xs text-muted mt-0.5">{note}</p>}
      </div>
      {right}
    </div>
  );
}
