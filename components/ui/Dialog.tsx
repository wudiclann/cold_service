"use client";

import { useEffect, type MouseEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { Blueprint } from "./Blueprint";

export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      style={{ animation: "fade-in 150ms ease-out" }}
      onClick={onClose}
    >
      <Blueprint
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-bg p-6"
        style={{ animation: "panel-in 180ms ease-out" }}
        onClick={stop}
      >
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-lg">{title}</h3>}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto text-black/40 hover:text-ink cursor-pointer"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
        {children}
      </Blueprint>
    </div>
  );
}
