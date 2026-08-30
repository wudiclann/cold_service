"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardList, LayoutDashboard, Wind } from "lucide-react";
import { useRole } from "@/lib/role-context";
import { Seg } from "@/components/ui/Seg";
import type { Role } from "@/lib/types";

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, ready, setRole } = useRole();
  const navigatingAway = useRef(false);

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
  const activeLabel = isAdminPath ? "Orders" : "Dashboard";
  const ActiveIcon = isAdminPath ? ClipboardList : LayoutDashboard;

  function handleRoleChange(next: Role) {
    if (next === role) return;
    navigatingAway.current = true;
    setRole(next);
    router.push(next === "Admin" ? "/admin" : next === "Manager" ? "/manager" : "/technician");
  }

  if (!ready || (role !== "Admin" && role !== "Manager")) return null;
  const expectedPath = role === "Admin" ? "/admin" : "/manager";
  if (!pathname.startsWith(expectedPath) && !navigatingAway.current) return null;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center flex-wrap gap-x-6 gap-y-2.5 px-4 sm:px-6 py-3.5 border-b border-divider">
        <div className="flex items-center gap-2 font-heading font-semibold text-base">
          <Wind size={18} strokeWidth={1.5} className="text-accent-700" />
          Sejuk Sejuk
        </div>
        <nav className="flex-1 flex gap-4 text-sm min-w-[80px]">
          <span className="flex items-center gap-1.5 text-accent-700 font-semibold">
            <ActiveIcon size={14} strokeWidth={1.5} />
            {activeLabel}
          </span>
        </nav>
        <Seg<Role>
          options={[
            { value: "Admin", label: "Admin" },
            { value: "Technician", label: "Technician" },
            { value: "Manager", label: "Manager" },
          ]}
          value={role}
          onChange={handleRoleChange}
        />
      </header>
      <main className="flex-1 px-4 sm:px-8 py-6 min-w-0 overflow-x-hidden">{children}</main>
    </div>
  );
}
