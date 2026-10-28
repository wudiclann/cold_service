"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

const pad = (n: number) => String(n).padStart(2, "0");
// Local calendar dates only: toISOString() would shift the day in some time zones.
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

interface DatePickerProps {
  /** "YYYY-MM-DD" */
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  /** Earliest pickable day, "YYYY-MM-DD". */
  min?: string;
  className?: string;
  "aria-label"?: string;
}

/**
 * The calendar opens inline, directly under the field, and pushes the content below it down.
 * It never floats, so it can't flip above the field or run off the screen in a short window or a bottom sheet.
 */
export function DatePicker({ value, onChange, min, className = "", ...aria }: DatePickerProps) {
  const today = new Date();
  const todayIso = toIso(today);
  const selected = value ? fromIso(value) : null;

  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => new Date((selected ?? today).getFullYear(), (selected ?? today).getMonth(), 1));
  const [focusIso, setFocusIso] = useState(value || todayIso);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const isDisabled = (iso: string) => !!min && iso < min;

  function openPicker() {
    const base = selected ?? today;
    setView(new Date(base.getFullYear(), base.getMonth(), 1));
    setFocusIso(value || (min && todayIso < min ? min : todayIso));
    setOpen(true);
  }

  function pick(iso: string) {
    if (isDisabled(iso)) return;
    onChange({ target: { value: iso } });
    setOpen(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // When it opens, make sure the whole calendar is in view (the dialog may need to scroll a little).
  useEffect(() => {
    if (open) popRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open]);

  // Keep keyboard focus on the focused day.
  useEffect(() => {
    if (!open) return;
    popRef.current?.querySelector<HTMLElement>(`[data-iso="${focusIso}"]`)?.focus({ preventScroll: true });
  }, [open, focusIso, view]);

  function moveFocus(next: Date) {
    setFocusIso(toIso(next));
    if (next.getMonth() !== view.getMonth() || next.getFullYear() !== view.getFullYear()) {
      setView(new Date(next.getFullYear(), next.getMonth(), 1));
    }
  }

  function onGridKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const f = fromIso(focusIso);
    const keys: Record<string, Date> = {
      ArrowLeft: addDays(f, -1),
      ArrowRight: addDays(f, 1),
      ArrowUp: addDays(f, -7),
      ArrowDown: addDays(f, 7),
      PageUp: new Date(f.getFullYear(), f.getMonth() - 1, f.getDate()),
      PageDown: new Date(f.getFullYear(), f.getMonth() + 1, f.getDate()),
    };
    if (keys[e.key]) {
      e.preventDefault();
      moveFocus(keys[e.key]);
    } else if (e.key === "Escape") {
      // Keep an enclosing dialog from also closing.
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  // Leading blanks so the first of the month falls on its weekday (weeks start on Monday).
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => toIso(new Date(view.getFullYear(), view.getMonth(), i + 1))),
  ];

  const prevMonthEnd = toIso(new Date(view.getFullYear(), view.getMonth(), 0));
  const canGoBack = !min || prevMonthEnd >= min;

  const shortcuts = [
    { label: "Tomorrow", iso: toIso(addDays(today, 1)) },
    { label: "In 3 days", iso: toIso(addDays(today, 3)) },
    { label: "Next week", iso: toIso(addDays(today, 7)) },
  ];

  return (
    <div ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={aria["aria-label"]}
        onClick={() => (open ? setOpen(false) : openPicker())}
        className={`w-full h-10 px-3 flex items-center justify-between gap-2 text-left text-sm bg-surface border rounded-md cursor-pointer hover:border-muted focus-visible:border-accent ${
          open ? "border-accent" : "border-control"
        } ${className}`}
      >
        <span className={selected ? "text-ink" : "text-faint"}>
          {selected
            ? selected.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
            : "Pick a date"}
        </span>
        <CalendarDays size={16} strokeWidth={1.5} className="shrink-0 text-muted" aria-hidden />
      </button>

      {open && (
        <div
          ref={popRef}
          id={id}
          role="group"
          aria-label="Choose a date"
          className="mt-2 rounded-xl border border-edge bg-surface p-3"
          style={{ animation: "panel-in 120ms ease-out" }}
        >
          <div className="flex items-center justify-between pb-2">
            <button
              type="button"
              aria-label="Previous month"
              disabled={!canGoBack}
              onClick={() => setView(addMonths(view, -1))}
              className="size-8 grid place-items-center rounded-md text-muted hover:bg-active hover:text-ink cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft size={16} strokeWidth={1.75} />
            </button>
            <div className="text-sm font-medium" aria-live="polite">
              {view.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
            </div>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setView(addMonths(view, 1))}
              className="size-8 grid place-items-center rounded-md text-muted hover:bg-active hover:text-ink cursor-pointer"
            >
              <ChevronRight size={16} strokeWidth={1.75} />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-xs text-muted pb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="h-8 grid place-items-center">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5" onKeyDown={onGridKeyDown}>
            {cells.map((iso, i) => {
              if (!iso) return <div key={`b${i}`} />;
              const isSel = iso === value;
              const isToday = iso === todayIso;
              const off = isDisabled(iso);
              return (
                <button
                  key={iso}
                  type="button"
                  data-iso={iso}
                  tabIndex={iso === focusIso ? 0 : -1}
                  aria-pressed={isSel}
                  aria-disabled={off}
                  aria-label={fromIso(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  onClick={() => pick(iso)}
                  className={`mx-auto size-9 rounded-md text-sm tabular-nums border ${
                    isSel
                      ? "bg-accent border-accent text-white font-medium cursor-pointer"
                      : off
                        ? "border-transparent text-[#b5b5b5] cursor-not-allowed"
                        : `cursor-pointer hover:bg-raised ${isToday ? "border-accent/50 text-accent font-medium" : "border-transparent"}`
                  }`}
                >
                  {Number(iso.slice(8))}
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-rule flex flex-wrap gap-x-4 gap-y-1">
            {shortcuts.map((s) => {
              const off = isDisabled(s.iso);
              return (
                <button
                  key={s.label}
                  type="button"
                  disabled={off}
                  onClick={() => pick(s.iso)}
                  className="h-7 text-sm font-medium underline decoration-transparent underline-offset-4 hover:decoration-current cursor-pointer disabled:text-[#b5b5b5] disabled:no-underline disabled:cursor-not-allowed"
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
