"use client";

import { CheckCircle2, X, XCircle } from "lucide-react";
import { useToast } from "@/lib/toast-context";

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2 w-[300px]">
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{ animation: "toast-in 180ms ease-out" }}
          className={`flex items-start gap-2 border px-3 py-2.5 text-xs shadow-md bg-bg ${
            t.variant === "error" ? "border-red-300" : "border-divider"
          }`}
        >
          {t.variant === "error" ? (
            <XCircle size={15} className="text-red-600 shrink-0 mt-0.5" strokeWidth={1.5} />
          ) : (
            <CheckCircle2 size={15} className="text-accent-700 shrink-0 mt-0.5" strokeWidth={1.5} />
          )}
          <span className="flex-1">{t.message}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => dismissToast(t.id)}
            className="text-black/40 hover:text-ink cursor-pointer shrink-0"
          >
            <X size={13} strokeWidth={1.5} />
          </button>
        </div>
      ))}
    </div>
  );
}
