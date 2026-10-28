import { createClient } from "@supabase/supabase-js";
import { NOT_CONFIGURED_MESSAGE } from "./config";
import { createEmptyClient } from "./stub";

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Without keys, reads come back empty and writes fail with a clear message (see stub.ts).
  if (!url || !serviceKey) return createEmptyClient(NOT_CONFIGURED_MESSAGE);
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
