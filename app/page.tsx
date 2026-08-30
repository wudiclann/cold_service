"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wind } from "lucide-react";
import { useRole } from "@/lib/role-context";
import { useTechnicians } from "@/lib/useTechnicians";
import { Blueprint } from "@/components/ui/Blueprint";
import { Seg } from "@/components/ui/Seg";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import type { Role } from "@/lib/types";

const ROLE_PATH: Record<Role, string> = {
  Admin: "/admin",
  Technician: "/technician",
  Manager: "/manager",
};

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
    <main className="flex-1 flex items-center justify-center p-6">
      <Blueprint className="w-full max-w-sm p-8 bg-bg">
        <div className="flex items-center gap-1.5 mb-1">
          <Wind size={14} strokeWidth={1.5} className="text-accent-700" />
          <h4 className="text-[13px] tracking-widest uppercase text-accent-700">Sejuk Sejuk Service</h4>
        </div>
        <h2 className="text-[22px] mb-4.5">Continue as</h2>
        <Seg<Role>
          options={[
            { value: "Admin", label: "Admin" },
            { value: "Technician", label: "Technician" },
            { value: "Manager", label: "Manager" },
          ]}
          value={selected}
          onChange={setSelected}
        />
        {selected === "Technician" && (
          <div className="mt-4">
            <label className="block text-[11px] text-black/60 mb-1">Logged in as</label>
            <Select value={techName} onChange={(e) => setTech(e.target.value)}>
              {technicians.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        <Button variant="primary" block marks className="mt-5" onClick={handleContinue}>
          Continue
        </Button>
        <p className="text-[11px] text-black/45 mt-3.5 mb-0">
          Mock login — no password. Technician also picks their name from the seed list.
        </p>
      </Blueprint>
    </main>
  );
}
