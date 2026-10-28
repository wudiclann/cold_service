import { createClient } from "@supabase/supabase-js";
import { NOT_CONFIGURED_MESSAGE, supabaseConfigured } from "./config";
import { createEmptyClient } from "./stub";

// Without keys the app still opens, with every list empty (see stub.ts).
export const supabase = supabaseConfigured
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  : createEmptyClient(NOT_CONFIGURED_MESSAGE);
