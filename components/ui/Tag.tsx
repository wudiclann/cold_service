import type { HTMLAttributes } from "react";
import type { OrderStatus } from "@/lib/types";

type Variant = "outline" | "neg";

const variants: Record<Variant, { pill: string; dot: string }> = {
  outline: { pill: "border border-control text-muted", dot: "border border-muted" },
  neg: { pill: "bg-pill-neg-bg text-pill-neg-ink", dot: "bg-negative" },
};

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  dot?: boolean;
}

export function Tag({ variant = "outline", dot = true, className = "", children, ...rest }: TagProps) {
  const v = variants[variant];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 h-5 px-2 text-xs font-medium whitespace-nowrap rounded-full ${v.pill} ${className}`}
      {...rest}
    >
      {dot && <span className={`size-1.5 rounded-full ${v.dot}`} aria-hidden />}
      {children}
    </span>
  );
}

// Status is a coloured dot and plain text: the dot carries the colour, the word stays ink.
export const STATUS_DOT: Record<OrderStatus, string> = {
  New: "bg-ink",
  Assigned: "bg-[#2f8fdc]",
  "In Progress": "bg-[#e0a800]",
  "Job Done": "bg-positive",
  Reviewed: "bg-[#7c4dcc]",
  Closed: "border-[1.5px] border-muted", // hollow
};

export function StatusTag({ status }: { status: OrderStatus }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm">
      <span className={`size-2 shrink-0 rounded-full ${STATUS_DOT[status]}`} aria-hidden />
      {status}
    </span>
  );
}
