"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRole } from "@/lib/role-context";
import { Brand, Mark } from "@/components/shell/Brand";
import { AskAiWidget } from "@/components/AskAiWidget";
import { SetupNotice } from "@/components/SetupNotice";
import { Button } from "@/components/ui/Button";
import type { Role } from "@/lib/types";

const ROLES: { role: Role; icon: LucideIcon }[] = [
  { role: "Admin", icon: ClipboardList },
  { role: "Manager", icon: LayoutDashboard },
  { role: "Technician", icon: Wrench },
];

const SIDEBAR_KEY = "cold-service-sidebar";

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, ready, setRole } = useRole();
  const navigatingAway = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  // Desktop sidebar: open by default, remembered between visits.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === "closed";
    } catch {
      return false;
    }
  });

  function toggleSidebar() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, c ? "open" : "closed");
      } catch {
        // storage unavailable — the sidebar just won't be remembered
      }
      return !c;
    });
  }

  useEffect(() => {
    if (!ready) return;
    if (navigatingAway.current) {
      // Once we've landed on a page consistent with the role we switched to,
      // re-arm the guard so it can catch future genuine mismatches (e.g. back/forward nav).
      const landed =
        (role === "Admin" && pathname.startsWith("/admin")) ||
        (role === "Manager" && pathname.startsWith("/manager")) ||
        (role === "Technician" && pathname.startsWith("/technician"));
      if (landed) navigatingAway.current = false;
      return;
    }
    if (role !== "Admin" && role !== "Manager") {
      router.replace("/");
      return;
    }
    const expectedPath = role === "Admin" ? "/admin" : "/manager";
    if (!pathname.startsWith(expectedPath)) {
      router.replace(expectedPath);
    }
  }, [ready, role, router, pathname]);

  const isAdminPath = pathname.startsWith("/admin");
  const pageLabel = isAdminPath ? "Orders" : "Dashboard";
  const PageIcon = isAdminPath ? ClipboardList : LayoutDashboard;

  function handleRoleChange(next: Role) {
    setMenuOpen(false);
    if (next === role) return;
    if (next === "Technician" && role) {
      try {
        sessionStorage.setItem("cold-service-last-panel", role);
      } catch {
        // storage unavailable — the technician page falls back to the Admin panel
      }
    }
    navigatingAway.current = true;
    setRole(next);
    router.push(next === "Admin" ? "/admin" : next === "Manager" ? "/manager" : "/technician");
  }

  if (!ready || (role !== "Admin" && role !== "Manager")) return null;
  const expectedPath = role === "Admin" ? "/admin" : "/manager";
  if (!pathname.startsWith(expectedPath) && !navigatingAway.current) return null;

  const sidebar = (
    <>
      <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-5">
        <Brand inverted />
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={toggleSidebar}
          className="hidden lg:grid size-8 -mr-2 -mt-1 place-items-center rounded-md text-white/90 hover:bg-white/15 hover:text-white cursor-pointer"
        >
          <PanelLeftClose size={16} strokeWidth={1.5} />
        </button>
      </div>

      <nav aria-label="Pages" className="px-2">
        <div className="px-2 pb-1.5 text-xs text-white/90">Operations</div>
        <div
          aria-current="page"
          className="flex items-center gap-2.5 h-[34px] px-2.5 rounded-lg bg-white/15 text-sm font-medium text-white"
        >
          <PageIcon size={16} strokeWidth={1.5} />
          {pageLabel}
        </div>
      </nav>

      <div className="mt-auto px-2 pb-3">
        <div className="px-2 pb-1.5 text-xs text-white/90">View as</div>
        {ROLES.map(({ role: r, icon: Icon }) => {
          const active = r === role;
          return (
            <button
              key={r}
              type="button"
              onClick={() => handleRoleChange(r)}
              aria-pressed={active}
              className={`w-full flex items-center gap-2.5 h-[34px] px-2.5 rounded-lg text-sm cursor-pointer hover:bg-white/10 ${
                active ? "text-white font-semibold" : "text-white/90"
              }`}
            >
              <Icon size={16} strokeWidth={1.5} />
              {r}
              {active && <span className="ml-auto size-1.5 rounded-full bg-white" aria-hidden />}
            </button>
          );
        })}
        <p className="px-2.5 pt-3 text-xs text-white/90">Demo mode: no password.</p>
      </div>
    </>
  );

  return (
    <div className="h-dvh flex bg-surface">
      {/* Desktop sidebar: full height, slides shut to zero width. The inner box keeps its width so content never squashes. */}
      <aside
        inert={collapsed}
        className={`hidden lg:block shrink-0 overflow-hidden bg-[#0066b8] text-white transition-[width] duration-200 ease-out ${
          collapsed ? "w-0" : "w-[228px]"
        }`}
      >
        <div className="w-[228px] h-full flex flex-col">{sidebar}</div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-12 shrink-0 flex items-center gap-2 px-3 lg:px-5 border-b border-edge bg-surface">
          <button
            type="button"
            aria-label="Open sidebar"
            onClick={() => setMenuOpen(true)}
            className="lg:hidden size-9 -ml-1 grid place-items-center rounded-md text-ink hover:bg-active cursor-pointer"
          >
            <PanelLeftOpen size={18} strokeWidth={1.5} />
          </button>
          {collapsed && (
            <button
              type="button"
              aria-label="Open sidebar"
              onClick={toggleSidebar}
              className="hidden lg:grid size-8 -ml-1.5 place-items-center rounded-md text-muted hover:bg-active hover:text-ink cursor-pointer"
            >
              <PanelLeftOpen size={16} strokeWidth={1.5} />
            </button>
          )}
          <div className="lg:hidden flex items-center">
            <Mark size={18} />
          </div>
          <div className="text-sm text-muted">
            <span className="hidden lg:inline">Service operations / </span>
            <span className="text-ink font-medium">{pageLabel}</span>
          </div>
          <div className="ml-auto">
            {role === "Manager" && (
              <Button onClick={() => setAiOpen(true)}>
                <Sparkles size={14} strokeWidth={1.5} />
                Ask AI
              </Button>
            )}
          </div>
        </header>

        <SetupNotice className="border-b" />

        <main className="relative flex-1 min-h-0 overflow-y-auto bg-surface">{children}</main>
      </div>

      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex bg-black/40" onClick={() => setMenuOpen(false)}>
          <div
            className="relative w-[280px] max-w-[85vw] h-full flex flex-col bg-[#0066b8] text-white"
            style={{ animation: "drawer-in 160ms ease-out" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1 flex flex-col overflow-y-auto">{sidebar}</div>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="absolute top-3 right-3 size-9 grid place-items-center rounded-md text-white/90 hover:bg-white/15 cursor-pointer"
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}

      {role === "Manager" && <AskAiWidget open={aiOpen} onClose={() => setAiOpen(false)} />}
    </div>
  );
}
