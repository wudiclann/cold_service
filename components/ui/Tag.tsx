import type { HTMLAttributes } from "react";
import { Circle, UserCheck, Wrench, CheckCircle2, Eye, Lock, type LucideIcon } from "lucide-react";
import type { OrderStatus } from "@/lib/types";

type Variant = "accent" | "accent-solid" | "neutral" | "outline" | "danger";

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  icon?: LucideIcon;
}

const variants: Record<Variant, string> = {
  accent: "bg-accent-100 text-accent-800",
  "accent-solid": "bg-accent text-bg",
  neutral: "bg-neutral-100 text-neutral-800",
  outline: "border border-accent text-accent-700",
  danger: "bg-red-50 text-red-700",
};

export function Tag({ variant = "neutral", icon: Icon, className = "", children, ...rest }: TagProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] tracking-wide px-2.5 py-0.5 rounded-none ${variants[variant]} ${className}`}
      {...rest}
    >
      {Icon && <Icon size={11} strokeWidth={2} />}
      {children}
    </span>
  );
}

const STATUS_VARIANT: Record<OrderStatus, Variant> = {
  New: "neutral",
  Assigned: "accent",
  "In Progress": "outline",
  "Job Done": "accent-solid",
  Reviewed: "outline",
  Closed: "neutral",
};

const STATUS_ICON: Record<OrderStatus, LucideIcon> = {
  New: Circle,
  Assigned: UserCheck,
  "In Progress": Wrench,
  "Job Done": CheckCircle2,
  Reviewed: Eye,
  Closed: Lock,
};

export function StatusTag({ status }: { status: OrderStatus }) {
  return (
    <Tag variant={STATUS_VARIANT[status]} icon={STATUS_ICON[status]}>
      {status}
    </Tag>
  );
}
