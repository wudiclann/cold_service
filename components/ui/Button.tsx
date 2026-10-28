import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "dark" | "secondary" | "ghost";
type Size = "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 cursor-pointer select-none whitespace-nowrap font-medium text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-[#0066b8] active:bg-[#005a9e]",
  dark: "bg-ink text-white hover:bg-[#2e3234] active:bg-black",
  secondary: "bg-surface text-ink border border-control hover:bg-raised active:bg-active",
  ghost: "bg-transparent text-muted hover:bg-active hover:text-ink",
};

const sizes: Record<Size, string> = {
  md: "h-8 px-3",
  lg: "h-11 px-4 text-[15px]",
};

export function Button({
  variant = "secondary",
  size = "md",
  block = false,
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${base} ${variants[variant]} ${sizes[size]} ${block ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
