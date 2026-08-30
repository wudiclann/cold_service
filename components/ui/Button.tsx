import type { ButtonHTMLAttributes } from "react";
import { CornerMarks } from "./Blueprint";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
  marks?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-1.5 cursor-pointer select-none font-heading font-semibold text-sm leading-tight rounded-none transition-colors disabled:opacity-45 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-bg border border-accent px-4 py-2 hover:bg-accent-600 active:bg-accent-700",
  secondary:
    "bg-transparent text-ink border border-divider px-4 py-2 hover:bg-black/5 active:bg-black/10",
  ghost: "bg-transparent text-accent-700 border border-transparent px-2 py-1.5 hover:bg-accent-100",
};

export function Button({
  variant = "secondary",
  block = false,
  marks = false,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`relative ${base} ${variants[variant]} ${block ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {marks && <CornerMarks />}
      {children}
    </button>
  );
}
