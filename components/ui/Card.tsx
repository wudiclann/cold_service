import type { HTMLAttributes } from "react";

export function Card({ className = "", children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-transparent border border-divider rounded-none p-5 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardKicker({ className = "", children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`text-[10px] uppercase tracking-widest text-accent-700 mb-2.5 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
