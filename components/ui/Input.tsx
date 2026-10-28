import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const base =
  "w-full h-10 px-3 text-sm text-ink bg-surface border border-control rounded-md hover:border-muted focus-visible:border-accent focus-visible:outline-accent disabled:bg-raised disabled:text-muted disabled:cursor-not-allowed";

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${base} ${className}`} {...rest} />;
}

export function Textarea({ className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${base} h-auto py-2 resize-y min-h-24 ${className}`} {...rest} />;
}

export { Select } from "./Select";
