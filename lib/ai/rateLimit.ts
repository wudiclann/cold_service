import { supabaseAdmin } from "@/lib/supabase/server";

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS = 10;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const admin = supabaseAdmin();
  const windowStart = new Date(Date.now() - WINDOW_MS);

  const { count } = await admin
    .from("ai_rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("identifier", identifier)
    .gte("requested_at", windowStart.toISOString());

  if ((count ?? 0) >= MAX_REQUESTS) {
    const { data: oldest } = await admin
      .from("ai_rate_limits")
      .select("requested_at")
      .eq("identifier", identifier)
      .gte("requested_at", windowStart.toISOString())
      .order("requested_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const oldestTime = oldest ? new Date(oldest.requested_at).getTime() : Date.now();
    const retryAfterMs = oldestTime + WINDOW_MS - Date.now();
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }

  await admin.from("ai_rate_limits").insert({ identifier });

  // Opportunistic cleanup of expired rows — best-effort, doesn't block the request.
  admin
    .from("ai_rate_limits")
    .delete()
    .lt("requested_at", windowStart.toISOString())
    .then(() => {});

  return { allowed: true };
}
