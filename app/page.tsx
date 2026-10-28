"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, LayoutDashboard, Wrench, type LucideIcon } from "lucide-react";
import { useRole } from "@/lib/role-context";
import { useTechnicians } from "@/lib/useTechnicians";
import { SetupNotice } from "@/components/SetupNotice";
import { Brand } from "@/components/shell/Brand";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Input";
import type { Role } from "@/lib/types";

const ROLE_PATH: Record<Role, string> = {
  Admin: "/admin",
  Technician: "/technician",
  Manager: "/manager",
};

const ROLES: { role: Role; icon: LucideIcon; hint: string }[] = [
  { role: "Admin", icon: ClipboardList, hint: "Take orders and assign technicians" },
  { role: "Technician", icon: Wrench, hint: "Work your jobs and log what was done" },
  { role: "Manager", icon: LayoutDashboard, hint: "Review finished jobs and weekly numbers" },
];

export default function RoleSelectPage() {
  const router = useRouter();
  const { setRole, setTechnicianName } = useRole();
  const { technicians } = useTechnicians();
  const [selected, setSelected] = useState<Role>("Admin");
  const [tech, setTech] = useState<string>("");

  const techName = tech || technicians[0]?.name || "";

  function handleContinue() {
    setRole(selected);
    if (selected === "Technician") setTechnicianName(techName);
    router.push(ROLE_PATH[selected]);
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-3 p-4 sm:p-6">
      <div className="w-full max-w-[440px] bg-surface border border-edge rounded-2xl p-6 sm:p-8">
        <Brand />
        <h1 className="text-[22px] leading-7 mt-8">Continue as</h1>
        <p className="text-sm text-muted mt-1">Pick the role you are working in today.</p>

        <div role="radiogroup" aria-label="Role" className="mt-5 flex flex-col gap-2">
          {ROLES.map(({ role: r, icon: Icon, hint }) => {
            const active = r === selected;
            return (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelected(r)}
                className={`flex items-center gap-3 text-left rounded-lg border px-3.5 py-3 cursor-pointer transition-colors ${
                  active
                    ? "border-accent bg-accent-soft"
                    : "border-edge hover:border-control hover:bg-raised"
                }`}
              >
                <Icon size={18} strokeWidth={1.5} className={active ? "text-accent" : "text-muted"} />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium">{r}</span>
                  <span className="block text-[13px] text-muted">{hint}</span>
                </span>
                <span
                  aria-hidden
                  className={`size-4 shrink-0 rounded-full border grid place-items-center ${
                    active ? "border-accent" : "border-control"
                  }`}
                >
                  {active && <span className="size-2 rounded-full bg-accent" />}
                </span>
              </button>
            );
          })}
        </div>

        {selected === "Technician" && (
          <Field label="Logged in as" className="mt-4">
            <Select value={techName} onChange={(e) => setTech(e.target.value)}>
              {technicians.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Button variant="primary" size="lg" block className="mt-6" onClick={handleContinue}>
          Continue
        </Button>
        <p className="text-xs text-muted mt-4">
          Demo login: no password. Technicians also pick their name from the seed list.
        </p>
      </div>
      <SetupNotice className="w-full max-w-[440px] rounded-lg border" />
    </main>
  );
}
