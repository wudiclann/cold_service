"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

interface Option {
  value: string;
  label: ReactNode;
}

interface SelectProps {
  value?: string;
  onChange?: (e: { target: { value: string } }) => void;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
  children: ReactNode;
}

const ITEM_HEIGHT = 36;
const MENU_MAX = 248;

// Same call shape as a native <select>: <Select value onChange><option value>…</option></Select>
function parseOptions(children: ReactNode): Option[] {
  const out: Option[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ value?: string | number; children?: ReactNode }>;
    const { value, children: label } = el.props;
    out.push({ value: value !== undefined ? String(value) : String(label ?? ""), label });
  });
  return out;
}

export function Select({ value, onChange, className = "", disabled, children, ...aria }: SelectProps) {
  const options = parseOptions(children);
  const current = String(value ?? "");
  const selectedIndex = options.findIndex((o) => o.value === current);
  const selected = options[selectedIndex];

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  function openMenu() {
    if (disabled) return;
    setActive(Math.max(0, selectedIndex));
    setOpen(true);
  }

  function choose(next: string) {
    onChange?.({ target: { value: next } });
    setOpen(false);
    triggerRef.current?.focus();
  }

  // Place the menu against the trigger, flipping upward when there is no room below.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const menuHeight = Math.min(options.length * ITEM_HEIGHT + 8, MENU_MAX);
    const below = window.innerHeight - r.bottom;
    const flip = below < menuHeight + 12 && r.top > below;
    setPos({
      left: r.left,
      width: r.width,
      top: flip ? undefined : r.bottom + 4,
      bottom: flip ? window.innerHeight - r.top + 4 : undefined,
    });
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false);
    }
    function onScroll(e: Event) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    }
    const close = () => setOpen(false);
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, pos]);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    const last = options.length - 1;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) openMenu();
        else setActive((i) => Math.min(last, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) openMenu();
        else setActive((i) => Math.max(0, i - 1));
        break;
      case "Home":
        if (open) {
          e.preventDefault();
          setActive(0);
        }
        break;
      case "End":
        if (open) {
          e.preventDefault();
          setActive(last);
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (open && options[active]) choose(options[active].value);
        else openMenu();
        break;
      case "Escape":
        if (open) {
          // Keep an enclosing dialog from also closing.
          e.stopPropagation();
          setOpen(false);
        }
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  const placeholder = current === "";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={aria["aria-label"]}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={`w-full h-10 px-3 flex items-center justify-between gap-2 text-left text-sm bg-surface border rounded-md cursor-pointer hover:border-muted focus-visible:border-accent disabled:bg-raised disabled:text-muted disabled:cursor-not-allowed ${
          open ? "border-accent" : "border-control"
        } ${className}`}
      >
        <span className={`truncate ${placeholder ? "text-faint" : "text-ink"}`}>{selected?.label ?? "Select…"}</span>
        <ChevronDown
          size={14}
          strokeWidth={1.75}
          className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            id={listId}
            role="listbox"
            className="fixed z-[70] overflow-y-auto p-1 bg-surface border border-edge rounded-lg shadow-lg"
            style={{
              left: pos.left,
              minWidth: pos.width,
              top: pos.top,
              bottom: pos.bottom,
              maxHeight: MENU_MAX,
              animation: "panel-in 120ms ease-out",
            }}
          >
            {options.map((o, i) => {
              const isSelected = i === selectedIndex;
              return (
                <div
                  key={`${o.value}-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  data-index={i}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(o.value);
                  }}
                  className={`flex items-center justify-between gap-4 h-9 px-2.5 rounded-md text-sm cursor-pointer whitespace-nowrap ${
                    i === active ? "bg-raised" : ""
                  } ${isSelected ? "font-medium" : ""} ${o.value === "" ? "text-muted" : "text-ink"}`}
                >
                  {o.label}
                  {isSelected && <Check size={14} strokeWidth={2} className="shrink-0 text-accent" aria-hidden />}
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
