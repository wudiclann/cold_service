import { fmtMoney } from "@/lib/format";

/** Currency in grey, figure in ink, fixed to two decimals. */
export function Money({
  value,
  className = "",
  prefixClassName = "text-muted",
}: {
  value: number | string;
  className?: string;
  prefixClassName?: string;
}) {
  return (
    <span className={`tabular-nums whitespace-nowrap ${className}`}>
      <span className={`mr-1 ${prefixClassName}`}>RM</span>
      {fmtMoney(value)}
    </span>
  );
}
