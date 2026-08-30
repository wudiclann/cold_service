import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

function startOfWeek(now: Date) {
  const day = now.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - diffToMonday);
  return monday;
}

export async function GET() {
  const admin = supabaseAdmin();
  const monday = startOfWeek(new Date());

  const { data: logs, error } = await admin
    .from("service_logs")
    .select("technician_name, final_amount, completed_at")
    .gte("completed_at", monday.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { count: awaitingReview } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "Job Done");

  const { data: postponements, error: postponeError } = await admin
    .from("postponements")
    .select("technician_name, postponed_at")
    .gte("postponed_at", monday.toISOString());

  if (postponeError) {
    return NextResponse.json({ error: postponeError.message }, { status: 500 });
  }

  const byTechnician: Record<
    string,
    { jobs_completed: number; total_amount: number; postponed: number }
  > = {};
  let totalJobs = 0;
  let totalRevenue = 0;
  let totalPostponed = 0;

  for (const log of logs ?? []) {
    const name = log.technician_name as string;
    if (!byTechnician[name]) byTechnician[name] = { jobs_completed: 0, total_amount: 0, postponed: 0 };
    byTechnician[name].jobs_completed += 1;
    byTechnician[name].total_amount += Number(log.final_amount);
    totalJobs += 1;
    totalRevenue += Number(log.final_amount);
  }

  for (const p of postponements ?? []) {
    const name = p.technician_name as string;
    if (!byTechnician[name]) byTechnician[name] = { jobs_completed: 0, total_amount: 0, postponed: 0 };
    byTechnician[name].postponed += 1;
    totalPostponed += 1;
  }

  return NextResponse.json({
    range: "week",
    totals: {
      jobs_completed: totalJobs,
      revenue: totalRevenue,
      awaiting_review: awaitingReview ?? 0,
      postponed: totalPostponed,
    },
    byTechnician: Object.entries(byTechnician).map(([technician_name, v]) => ({
      technician_name,
      ...v,
    })),
  });
}
