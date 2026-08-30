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
      className={`text-left text-[10.5px] tracking-wider uppercase text-black/50 px-2 py-2 border-b border-divider ${className}`}
      {...rest}
    >
      {children}
    </th>
  );
}

export function Td({ className = "", children, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`px-2 py-2 border-b border-black/8 ${className}`} {...rest}>
      {children}
    </td>
  );
}
