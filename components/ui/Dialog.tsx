"use client";

import { useEffect, type MouseEvent, type ReactNode } from "react";
import { X } from "lucide-react";

export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function stop(e: MouseEvent) {
    e.stopPropagation();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40"
      style={{ animation: "fade-in 120ms ease-out" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full sm:max-w-lg max-h-[90dvh] overflow-y-auto bg-surface rounded-t-xl sm:rounded-xl border border-edge shadow-xl p-5 sm:p-6"
        style={{ animation: "panel-in 160ms ease-out" }}
        onClick={stop}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          {title && <h2 className="text-lg">{title}</h2>}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto -mr-1.5 -mt-1 size-8 grid place-items-center rounded-md text-muted hover:bg-active hover:text-ink cursor-pointer"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
