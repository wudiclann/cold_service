import { supabaseAdmin } from "@/lib/supabase/server";
import { isOverdue } from "@/lib/types";
import type { AiIntent } from "./intent";

function startOfWeek(now: Date) {
  const day = now.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - diffToMonday);
  return monday;
}

function resolveDateRange(range: "today" | "this_week" | "last_week"): { from: Date; to: Date } {
  const now = new Date();
  if (range === "today") {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    return { from, to: now };
  }
  const thisMonday = startOfWeek(now);
  if (range === "this_week") {
    return { from: thisMonday, to: now };
  }
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(lastMonday.getDate() - 7);
  const justBeforeThisMonday = new Date(thisMonday.getTime() - 1);
  return { from: lastMonday, to: justBeforeThisMonday };
}

export interface QueryResult {
  summary: Record<string, unknown>;
  rows: Record<string, unknown>[];
}

export async function runScopedQuery(intent: AiIntent): Promise<QueryResult> {
  const admin = supabaseAdmin();

  if (intent.metric === "completed_jobs") {
    const { from, to } = resolveDateRange(intent.date_range ?? "this_week");
    let query = admin
      .from("service_logs")
      .select("technician_name, final_amount, completed_at, orders(order_no, service_type)")
      .gte("completed_at", from.toISOString())
      .lte("completed_at", to.toISOString());
    if (intent.technician_name) {
      query = query.ilike("technician_name", intent.technician_name);
    }
    const { data } = await query;

    const rows = (data ?? []).map((r) => {
      const row = r as unknown as {
        technician_name: string;
        final_amount: number;
        completed_at: string;
        orders: { order_no: string; service_type: string } | null;
      };
      return {
        order_no: row.orders?.order_no ?? null,
        service_type: row.orders?.service_type ?? null,
        technician_name: row.technician_name,
        completed_at: row.completed_at,
        final_amount: Number(row.final_amount),
      };
    });

    const byTechnician: Record<string, { jobs: number; revenue: number }> = {};
    for (const r of rows) {
      const name = r.technician_name;
      if (!byTechnician[name]) byTechnician[name] = { jobs: 0, revenue: 0 };
      byTechnician[name].jobs += 1;
      byTechnician[name].revenue += r.final_amount;
    }

    return {
      summary: {
        date_range: intent.date_range ?? "this_week",
        technician_filter: intent.technician_name,
        total_jobs: rows.length,
        total_revenue: rows.reduce((sum, r) => sum + r.final_amount, 0),
        by_technician: byTechnician,
      },
      rows,
    };
  }

  if (intent.metric === "postponements") {
    const { from, to } = resolveDateRange(intent.date_range ?? "this_week");
    let query = admin
      .from("postponements")
      .select("technician_name, postponed_at, rescheduled_to, orders(order_no)")
      .gte("postponed_at", from.toISOString())
      .lte("postponed_at", to.toISOString());
    if (intent.technician_name) {
      query = query.ilike("technician_name", intent.technician_name);
    }
    const { data } = await query;

    const rows = (data ?? []).map((r) => {
      const row = r as unknown as {
        technician_name: string;
        postponed_at: string;
        rescheduled_to: string | null;
        orders: { order_no: string } | null;
      };
      return {
        order_no: row.orders?.order_no ?? null,
        technician_name: row.technician_name,
        postponed_at: row.postponed_at,
        rescheduled_to: row.rescheduled_to,
      };
    });

    return {
      summary: {
        date_range: intent.date_range ?? "this_week",
        technician_filter: intent.technician_name,
        total_postponements: rows.length,
      },
      rows,
    };
  }

  if (intent.metric === "overdue") {
    const { data } = await admin
      .from("orders")
      .select("order_no, customer_name, status, due_date, technicians(name)")
      .in("status", ["New", "Assigned", "In Progress"]);

    let rows = (data ?? [])
      .map((r) => {
        const row = r as unknown as {
          order_no: string;
          customer_name: string;
          status: "New" | "Assigned" | "In Progress";
          due_date: string;
          technicians: { name: string } | null;
        };
        return {
          order_no: row.order_no,
          customer_name: row.customer_name,
          status: row.status,
          due_date: row.due_date,
          technician_name: row.technicians?.name ?? null,
          _overdue: isOverdue({ status: row.status, due_date: row.due_date }),
        };
      })
      .filter((r) => r._overdue)
      .map(({ _overdue, ...r }) => r);

    if (intent.technician_name) {
      const nameLower = intent.technician_name.toLowerCase();
      rows = rows.filter((r) => r.technician_name?.toLowerCase() === nameLower);
    }

    return {
      summary: { technician_filter: intent.technician_name, total_overdue: rows.length },
      rows,
    };
  }

  return { summary: {}, rows: [] };
}
