import type { TableHTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from "react";

export function Table({ className = "", children, ...rest }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table className={`w-full border-collapse text-sm ${className}`} {...rest}>
      {children}
    </table>
  );
}

export function Th({ className = "", children, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`text-left text-xs font-normal text-muted px-3 h-10 border-b border-edge whitespace-nowrap first:pl-[var(--edge,1.5rem)] last:pr-[var(--edge,1.5rem)] ${className}`}
      {...rest}
    >
      {children}
    </th>
  );
}

export function Td({ className = "", children, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={`px-3 h-12 border-b border-rule align-middle first:pl-[var(--edge,1.5rem)] last:pr-[var(--edge,1.5rem)] ${className}`}
      {...rest}
    >
      {children}
    </td>
  );
}
