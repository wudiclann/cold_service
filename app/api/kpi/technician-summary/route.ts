import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

function startOfWeek(now: Date) {
  const day = now.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - diffToMonday);
  return monday;
}

function dateKey(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function startOfYear(now: Date) {
  return new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
}

function startOfMonth(now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

export async function GET(req: NextRequest) {
  const admin = supabaseAdmin();
  const rangeParam = req.nextUrl.searchParams.get("range");
  const range = rangeParam === "year" ? "year" : rangeParam === "month" ? "month" : "week";
  const from =
    range === "year" ? startOfYear(new Date()) : range === "month" ? startOfMonth(new Date()) : startOfWeek(new Date());

  const { data: logs, error } = await admin
    .from("service_logs")
    .select("order_id, technician_name, final_amount, completed_at")
    .gte("completed_at", from.toISOString());

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
    .gte("postponed_at", from.toISOString());

  if (postponeError) {
    return NextResponse.json({ error: postponeError.message }, { status: 500 });
  }

  // Service type per completed job, for the revenue breakdown.
  const orderIds = [...new Set((logs ?? []).map((l) => l.order_id as string))];
  const serviceByOrder: Record<string, string> = {};
  if (orderIds.length) {
    const { data: svc } = await admin.from("orders").select("id, service_type").in("id", orderIds);
    for (const o of svc ?? []) serviceByOrder[o.id as string] = o.service_type as string;
  }

  // Every order by stage: the overall progress, not limited to the period.
  const { data: statusRows } = await admin.from("orders").select("status");
  const pipeline: Record<string, number> = {};
  for (const r of statusRows ?? []) pipeline[r.status as string] = (pipeline[r.status as string] ?? 0) + 1;

  // A dense series so empty periods are drawn as zero: one point per day for a week or a month,
  // one per month for a year (365 columns would be unreadable).
  const granularity = range === "year" ? "month" : "day";
  const keyOf = granularity === "month" ? monthKey : dateKey;
  const byDayMap: Record<string, { date: string; jobs: number; revenue: number }> = {};
  if (granularity === "month") {
    for (let m = 0; m < 12; m++) {
      const d = new Date(from.getFullYear(), m, 1);
      byDayMap[monthKey(d)] = { date: monthKey(d), jobs: 0, revenue: 0 };
    }
  } else {
    const end =
      range === "month"
        ? new Date(from.getFullYear(), from.getMonth() + 1, 0)
        : new Date(from.getFullYear(), from.getMonth(), from.getDate() + 6);
    for (let d = new Date(from); d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      byDayMap[dateKey(d)] = { date: dateKey(d), jobs: 0, revenue: 0 };
    }
  }
  const byServiceMap: Record<string, { service: string; jobs: number; revenue: number }> = {};
  for (const log of logs ?? []) {
    const day = byDayMap[keyOf(new Date(log.completed_at as string))];
    if (day) {
      day.jobs += 1;
      day.revenue += Number(log.final_amount);
    }
    const service = serviceByOrder[log.order_id as string] ?? "Other";
    byServiceMap[service] ??= { service, jobs: 0, revenue: 0 };
    byServiceMap[service].jobs += 1;
    byServiceMap[service].revenue += Number(log.final_amount);
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
    range,
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
    granularity,
    byDay: Object.values(byDayMap),
    byService: Object.values(byServiceMap).sort((a, b) => b.revenue - a.revenue),
    pipeline,
  });
}
