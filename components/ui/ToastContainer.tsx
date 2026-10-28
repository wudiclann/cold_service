"use client";

import { CheckCircle2, X, XCircle } from "lucide-react";
import { useToast } from "@/lib/toast-context";

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 w-[min(380px,calc(100vw-32px))]"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{ animation: "panel-in 160ms ease-out" }}
          className="flex items-start gap-2.5 rounded-lg bg-ink text-white px-3.5 py-3 text-sm shadow-lg"
        >
          {t.variant === "error" ? (
            <XCircle size={16} className="text-[#ff8a85] shrink-0 mt-0.5" strokeWidth={1.75} />
          ) : (
            <CheckCircle2 size={16} className="text-[#6fdca0] shrink-0 mt-0.5" strokeWidth={1.75} />
          )}
          <span className="flex-1">{t.message}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => dismissToast(t.id)}
            className="text-white/60 hover:text-white cursor-pointer shrink-0"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>
      ))}
    </div>
  );
}
