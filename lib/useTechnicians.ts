"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Technician } from "@/lib/types";

export function useTechnicians() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("technicians")
      .select("*")
      .order("name")
      .then(({ data }) => {
        if (!cancelled) {
          setTechnicians(data ?? []);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { technicians, loading };
}
