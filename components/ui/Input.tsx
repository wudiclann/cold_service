import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";

const base =
  "w-full min-h-9 px-2.5 py-1.5 text-sm text-ink bg-surface border border-divider rounded-none hover:border-black/45 focus-visible:border-accent";

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${base} ${className}`} {...rest} />;
}

export function Textarea({ className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${base} resize-y min-h-[70px] ${className}`} {...rest} />;
}

export function Select({ className = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${base} ${className}`} {...rest}>
      {children}
    </select>
  );
}
