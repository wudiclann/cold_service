"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Role } from "./types";

interface RoleState {
  role: Role | null;
  technicianName: string | null;
}

interface RoleContextValue extends RoleState {
  ready: boolean;
  setRole: (role: Role | null) => void;
  setTechnicianName: (name: string | null) => void;
}

const STORAGE_KEY = "sejuk-role";
const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RoleState>({ role: null, technicianName: null });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw));
    } catch {
      // ignore malformed storage
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, ready]);

  function setRole(role: Role | null) {
    setState((s) => ({ role, technicianName: role === "Technician" ? s.technicianName : null }));
  }

  function setTechnicianName(technicianName: string | null) {
    setState((s) => ({ ...s, technicianName }));
  }

  return (
    <RoleContext.Provider value={{ ...state, ready, setRole, setTechnicianName }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
