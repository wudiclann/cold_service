"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useTechnicians } from "@/lib/useTechnicians";
import { useToast } from "@/lib/toast-context";
import { fmtDate, fmtDateTime, fmtMoney } from "@/lib/format";
import { SERVICE_TYPES, type Order, type ServiceLog, type OrderStatus } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ColumnChart, type ColumnDatum } from "@/components/ui/ColumnChart";
import { Dialog } from "@/components/ui/Dialog";
import { Money } from "@/components/ui/Money";
import { Pagination } from "@/components/ui/Pagination";
import { Seg } from "@/components/ui/Seg";
import { Skeleton } from "@/components/ui/Skeleton";
import { STATUS_DOT, StatusTag, Tag } from "@/components/ui/Tag";
import { Table, Th, Td } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|heic)$/i;

interface Kpi {
  totals: { jobs_completed: number; revenue: number; awaiting_review: number; postponed: number };
  byTechnician: {
    technician_name: string;
    jobs_completed: number;
    total_amount: number;
    postponed: number;
  }[];
  byDay: { date: string; jobs: number; revenue: number }[];
  byService: { service: string; jobs: number; revenue: number }[];
  pipeline: Partial<Record<OrderStatus, number>>;
  /** "day" for a week or month, "month" for a year. */
  granularity?: "day" | "month";
}

type Range = "week" | "month" | "year";

// Who is on the hook for an overdue order. A technician owns it while it is out with them;
// the manager owns it when it is done and waiting for review; the admin owns it when nobody
// is assigned, or when it is reviewed and waiting to be closed.
function responsibleFor(o: Order, technicianName: string | null) {
  if (o.status === "Job Done") return { role: "Manager" as const, who: "Manager", why: "Done, waiting for your review" };
  if (o.status === "Reviewed") return { role: "Admin" as const, who: "Admin", why: "Reviewed, waiting to be closed" };
  if (!o.assigned_technician_id) return { role: "Admin" as const, who: "Admin", why: "No technician assigned" };
  return {
    role: "Technician" as const,
    who: technicianName ?? "Technician",
    why: o.status === "Assigned" ? "Assigned, not started" : "Started, not finished",
  };
}

function daysLate(due: string) {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const d = new Date(due);
  d.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((t.getTime() - d.getTime()) / 86_400_000));
}

const OVERDUE_PAGE_SIZE = 6;

// Stages in workflow order; the bar colours match the status dots.
const STAGES: { status: OrderStatus; bar: string }[] = [
  { status: "New", bar: "#131416" },
  { status: "Assigned", bar: "#2f8fdc" },
  { status: "In Progress", bar: "#e0a800" },
  { status: "Job Done", bar: "#1e7b4f" },
  { status: "Reviewed", bar: "#7c4dcc" },
  { status: "Closed", bar: "#c8c8c8" },
];

const compact = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n));

const REVIEW_STATUSES: OrderStatus[] = ["Job Done", "Reviewed", "Closed"];
const PAGE_SIZE = 8;

type Queue = "Job Done" | "Reviewed" | "Closed" | "Overdue";
// Words of the trade: a Job Done order is one waiting on the manager.
const QUEUE_LABEL: Record<Queue, string> = {
  "Job Done": "Awaiting review",
  Reviewed: "Reviewed",
  Closed: "Closed",
  Overdue: "Overdue",
};

export default function ManagerPage() {
  const { technicians, loading: techLoading } = useTechnicians();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [logs, setLogs] = useState<Record<string, ServiceLog>>({});
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [queue, setQueue] = useState<Queue>("Job Done");
  const [viewing, setViewing] = useState<Order | null>(null);
  const [range, setRange] = useState<Range>("week");
  const [overdue, setOverdue] = useState<Order[]>([]);
  const [overduePage, setOverduePage] = useState(1);

  const techNames = technicians.map((t) => t.name);
  const technicianName = (id: string | null) => technicians.find((t) => t.id === id)?.name ?? "—";

  async function loadOrders() {
    setLoading(true);
    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .in("status", REVIEW_STATUSES)
      .order("updated_at", { ascending: false });

    const ids = (ordersData ?? []).map((o: Order) => o.id);
    let logsByOrder: Record<string, ServiceLog> = {};
    if (ids.length) {
      const { data: logsData } = await supabase.from("service_logs").select("*").in("order_id", ids);
      logsByOrder = Object.fromEntries((logsData ?? []).map((l: ServiceLog) => [l.order_id, l]));
    }
    setOrders(ordersData ?? []);
    setLogs(logsByOrder);
    setLoading(false);
  }

  async function loadKpi() {
    const res = await fetch(`/api/kpi/technician-summary?range=${range}`);
    if (res.ok) setKpi(await res.json());
  }

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadOverdue() {
    // Past due and not closed, whoever is holding it.
    const today = new Date().toLocaleDateString("en-CA");
    const { data } = await supabase
      .from("orders")
      .select("*")
      .in("status", ["New", "Assigned", "In Progress", "Job Done", "Reviewed"])
      .lt("due_date", today)
      .order("due_date", { ascending: true });
    setOverdue(data ?? []);
  }

  useEffect(() => {
    loadOverdue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadKpi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  useEffect(() => {
    setPage(1);
  }, [queue, orders.length]);

  const counts = useMemo(() => {
    const c: Record<Queue, number> = { "Job Done": 0, Reviewed: 0, Closed: 0, Overdue: 0 };
    for (const o of orders) c[o.status as Queue] += 1;
    return c;
  }, [orders]);

  const queueOrders = useMemo(() => {
    const finishedAt = (o: Order) => new Date(logs[o.id]?.completed_at ?? o.updated_at).getTime();
    return orders.filter((o) => o.status === queue).sort((a, b) => finishedAt(b) - finishedAt(a));
  }, [orders, logs, queue]);

  const paginatedOrders = queueOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleReview(id: string) {
    const res = await fetch(`/api/orders/${id}/review`, { method: "PATCH" });
    if (res.ok) {
      setViewing((v) => (v && v.id === id ? { ...v, status: "Reviewed" } : v));
      showToast("Order marked as reviewed", "success");
      await loadOrders();
      await loadKpi();
      await loadOverdue();
    } else {
      showToast("Failed to mark order as reviewed — please try again", "error");
    }
  }

  const viewingLog = viewing ? logs[viewing.id] : undefined;
  const periodWord = range === "week" ? "this week" : range === "month" ? "this month" : "this year";
  const grain = kpi?.granularity === "month" ? "month" : "day";

  const days = kpi?.byDay ?? [];
  const dayData = (pick: (d: Kpi["byDay"][number]) => { value: number; text: string }): ColumnDatum[] =>
    days.map((d) => {
      const dt = new Date(`${d.date}T00:00:00`);
      const { value, text } = pick(d);
      return {
        key: d.date,
        // Week: a weekday under every column. Month: every fifth day, so labels never collide.
        // Year: a month name under each of the 12 columns.
        label:
          grain === "month"
            ? dt.toLocaleDateString("en-GB", { month: "short" })
            : range === "week"
              ? dt.toLocaleDateString("en-GB", { weekday: "short" })
              : (dt.getDate() - 1) % 5 === 0
                ? String(dt.getDate())
                : "",
        value,
        tooltip: `${
          grain === "month"
            ? dt.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
            : dt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
        } · ${text}`,
      };
    });
  const revenueData = dayData((d) => ({ value: d.revenue, text: `RM ${fmtMoney(d.revenue)}` }));
  const jobsData = dayData((d) => ({ value: d.jobs, text: `${d.jobs} ${d.jobs === 1 ? "job" : "jobs"}` }));

  const overdueRows = overdue.map((o) => {
    const techName = technicians.find((t) => t.id === o.assigned_technician_id)?.name ?? null;
    return { order: o, late: daysLate(o.due_date), ...responsibleFor(o, techName) };
  });
  const overdueWithTechs = overdueRows.filter((r) => r.role === "Technician").length;
  const overdueWithManager = overdueRows.filter((r) => r.role === "Manager").length;
  const overdueWithAdmin = overdueRows.length - overdueWithTechs - overdueWithManager;
  const pagedOverdue = overdueRows.slice((overduePage - 1) * OVERDUE_PAGE_SIZE, overduePage * OVERDUE_PAGE_SIZE);

  const pipelineTotal = STAGES.reduce((n, s) => n + (kpi?.pipeline[s.status] ?? 0), 0);
  // Every service type is listed, zeros included, so the card keeps its shape in a quiet period.
  const serviceRows = [
    ...SERVICE_TYPES.map((t) => kpi?.byService.find((s) => s.service === t) ?? { service: t as string, jobs: 0, revenue: 0 }),
    ...(kpi?.byService ?? []).filter((s) => !(SERVICE_TYPES as readonly string[]).includes(s.service)),
  ].sort((a, b) => b.revenue - a.revenue);
  const serviceMax = Math.max(1, ...serviceRows.map((s) => s.revenue));

  const leaderboard = technicians
    .map((t) => {
      const match = kpi?.byTechnician.find((k) => k.technician_name === t.name);
      return {
        technician_name: t.name,
        jobs_completed: match?.jobs_completed ?? 0,
        total_amount: match?.total_amount ?? 0,
        postponed: match?.postponed ?? 0,
      };
    })
    .sort((a, b) => b.jobs_completed - a.jobs_completed || b.total_amount - a.total_amount);

  const maxJobs = Math.max(1, ...leaderboard.map((t) => t.jobs_completed));

  // One variable for "waiting on you": the headline, the KPI and the tab all read it.
  const awaiting = loading ? kpi?.totals.awaiting_review : counts["Job Done"];
  const finding =
    awaiting === undefined
      ? "Loading…"
      : awaiting > 0
        ? `${awaiting} ${awaiting === 1 ? "job is" : "jobs are"} waiting for your review.`
        : "Nothing is waiting for your review.";

  // The manager only reviews. Closing a reviewed order is the admin's job.
  function actionFor(o: Order, size?: "lg") {
    if (o.status !== "Job Done") return null;
    return (
      <Button size={size} onClick={() => handleReview(o.id)}>
        Mark reviewed
      </Button>
    );
  }

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-[22px] leading-7">Dashboard</h1>
          <p className="text-sm text-muted mt-1">{finding}</p>
        </div>
        <Seg<Range>
          label="Period"
          options={[
            { value: "week", label: "Weekly" },
            { value: "month", label: "Monthly" },
            { value: "year", label: "Yearly" },
          ]}
          value={range}
          onChange={setRange}
        />
      </div>

      {/* KPI strip: one container, four equal columns split by 1px rules (2 x 2 on a phone). */}
      <Card className="grid grid-cols-2 lg:grid-cols-4 overflow-hidden">
        <Kpi
          label="Awaiting review"
          lead
          onClick={() => {
            setQueue("Job Done");
            document.getElementById("finished-jobs")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        >
          {awaiting === undefined ? <Skeleton className="h-9 w-12" /> : awaiting}
        </Kpi>
        <Kpi label={`Jobs completed ${periodWord}`} className="border-l border-edge">
          {kpi ? kpi.totals.jobs_completed : <Skeleton className="h-6 w-10" />}
        </Kpi>
        <Kpi label={`Revenue ${periodWord}`} className="border-t lg:border-t-0 lg:border-l border-edge">
          {kpi ? <Money value={kpi.totals.revenue} prefixClassName="text-muted text-base" /> : <Skeleton className="h-6 w-28" />}
        </Kpi>
        <Kpi label={`Postponed ${periodWord}`} className="border-t border-l lg:border-t-0 border-edge">
          {kpi ? kpi.totals.postponed : <Skeleton className="h-6 w-10" />}
        </Kpi>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader
            title="Revenue"
            note={`Final amount of completed jobs, by ${grain} ${periodWord}`}
            right={
              <div className="text-xl tabular-nums shrink-0">
                {kpi ? <Money value={kpi.totals.revenue} prefixClassName="text-muted text-sm" /> : <Skeleton className="h-6 w-24" />}
              </div>
            }
          />
          <div className="px-5 pb-5">
            {kpi ? (
              <ColumnChart
                data={revenueData}
                format={compact}
                emptyMax={400}
                ariaLabel={`Revenue by ${grain} ${periodWord}`}
              />
            ) : (
              <Skeleton className="h-[200px] w-full" />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Jobs completed"
            note={`Jobs finished by technicians, by ${grain} ${periodWord}`}
            right={
              <div className="text-xl tabular-nums shrink-0">
                {kpi ? kpi.totals.jobs_completed : <Skeleton className="h-6 w-10" />}
              </div>
            }
          />
          <div className="px-5 pb-5">
            {kpi ? (
              <ColumnChart data={jobsData} integer ariaLabel={`Jobs completed by ${grain} ${periodWord}`} />
            ) : (
              <Skeleton className="h-[200px] w-full" />
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="flex flex-col">
          <CardHeader
            title="Progress"
            note="Every order by stage, from New to Closed"
            right={
              <div className="text-sm text-muted shrink-0">
                {kpi ? `${pipelineTotal} orders` : <Skeleton className="h-5 w-16" />}
              </div>
            }
          />
          <div className="px-5 pb-5">
            {kpi && pipelineTotal > 0 ? (
              <>
                <div className="flex gap-0.5 h-3" role="img" aria-label="Orders by stage">
                  {STAGES.filter((s) => (kpi.pipeline[s.status] ?? 0) > 0).map((s) => (
                    <div
                      key={s.status}
                      className="first:rounded-l-full last:rounded-r-full"
                      style={{ flex: kpi.pipeline[s.status], background: s.bar }}
                      title={`${s.status}: ${kpi.pipeline[s.status]}`}
                    />
                  ))}
                </div>
                <ul className="mt-3">
                  {STAGES.map((s) => {
                    const n = kpi.pipeline[s.status] ?? 0;
                    return (
                      <li
                        key={s.status}
                        className="flex items-center gap-2.5 h-9 border-b border-rule last:border-b-0"
                      >
                        <span className={`size-2 shrink-0 rounded-full ${STATUS_DOT[s.status]}`} aria-hidden />
                        <span className="flex-1">{s.status}</span>
                        <span className="tabular-nums font-medium">{n}</span>
                        <span className="w-10 text-right text-xs text-muted tabular-nums">
                          {Math.round((n / pipelineTotal) * 100)}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-muted">
                {kpi ? "No orders yet." : "Loading…"}
              </p>
            )}
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader title="Revenue by service" note={`What each type of job earned ${periodWord}`} />
          <div className="px-5 pb-5 flex-1 flex flex-col">
            {kpi ? (
              <ul className="flex-1 flex flex-col">
                {serviceRows.map((s) => (
                  <li key={s.service} className="flex-1 flex flex-col justify-center py-2.5 border-b border-rule last:border-b-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-medium">{s.service}</span>
                      <span className="tabular-nums">
                        <Money value={s.revenue} />
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <div className="flex-1 h-2">
                        <div
                          className="h-full rounded-full bg-chart"
                          style={{ width: s.revenue > 0 ? `${Math.max((s.revenue / serviceMax) * 100, 3)}%` : 0 }}
                        />
                      </div>
                      <span className="text-xs text-muted tabular-nums w-14 text-right">
                        {s.jobs} {s.jobs === 1 ? "job" : "jobs"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-8 text-center text-sm text-muted">Loading…</p>
            )}
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader title="Technicians" note={`Jobs completed ${periodWord}, most first`} />
          <ol className="px-5 pb-3 flex-1 flex flex-col">
            {techLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="py-3">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-2 w-full" />
                </li>
              ))}
            {!techLoading && technicians.length === 0 && (
              <li className="py-8 text-center text-sm text-muted">No technicians yet.</li>
            )}
            {leaderboard.map((t) => {
              const pct = t.jobs_completed > 0 ? Math.max((t.jobs_completed / maxJobs) * 100, 4) : 0;
              return (
                <li key={t.technician_name} className="flex-1 flex flex-col justify-center py-3 border-b border-rule last:border-b-0">
                  <div className="flex items-center gap-3">
                    <Avatar name={t.technician_name} names={techNames} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{t.technician_name}</span>
                        {t.postponed > 0 && <Tag variant="neg">{t.postponed} postponed</Tag>}
                      </div>
                      {pct > 0 && (
                        <div className="mt-1.5 h-2">
                          <div className="h-full rounded-full bg-chart" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div>
                        <span className="font-medium tabular-nums">{t.jobs_completed}</span>
                        <span className="text-muted"> {t.jobs_completed === 1 ? "job" : "jobs"}</span>
                      </div>
                      <div className="text-xs text-muted tabular-nums">RM {fmtMoney(t.total_amount)}</div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>

      <div>
        <Card id="finished-jobs" className="overflow-hidden scroll-mt-4">
          <CardHeader title="Jobs" note="Review what technicians have completed (the admin closes the order afterwards) and chase anything overdue." />
          <Tabs
            className="px-5"
            value={queue}
            onChange={setQueue}
            options={(Object.keys(QUEUE_LABEL) as Queue[]).map((q) => ({
              value: q,
              label: QUEUE_LABEL[q],
              count: q === "Overdue" ? overdueRows.length : loading ? undefined : counts[q],
              alert: q === "Overdue" && overdueRows.length > 0,
            }))}
          />

          {queue === "Overdue" ? (
            <>
              <p className="px-5 py-3 text-sm text-muted">
                {overdueRows.length} past their due date: {overdueWithTechs} with technicians, {overdueWithAdmin} with the
                admin, {overdueWithManager} with you.
              </p>
        <div className="hidden md:block [--edge:1.25rem]">
          <Table>
            <thead>
              <tr>
                <Th className="w-[26%]">Job</Th>
                <Th>Responsible</Th>
                <Th>Why it is stuck</Th>
                <Th>Due</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {pagedOverdue.length === 0 && (
                <tr>
                  <Td colSpan={5} className="!h-24 text-center text-muted">
                    Nothing is overdue.
                  </Td>
                </tr>
              )}
              {pagedOverdue.map(({ order: o, late, role, who, why }) => (
                <tr key={o.id} className="hover:bg-raised">
                  <Td className="!h-14">
                    <button type="button" className="block text-left cursor-pointer" onClick={() => setViewing(o)}>
                      <span className="block font-medium hover:underline">{o.customer_name}</span>
                      <span className="block font-mono text-xs text-muted">{o.order_no}</span>
                    </button>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-2">
                      {role === "Technician" ? <Avatar name={who} /> : <Avatar name={who} label={role === "Admin" ? "AD" : "MG"} outline />}
                      <span>
                        {who}
                        {role === "Technician" && <span className="text-muted"> · Technician</span>}
                      </span>
                    </span>
                  </Td>
                  <Td className="text-muted">{why}</Td>
                  <Td>
                    <span className="inline-flex items-center gap-2 whitespace-nowrap text-negative">
                      <span className="size-1.5 rounded-full bg-negative" aria-hidden />
                      {fmtDate(o.due_date)}
                      <span className="text-muted">
                        · {late} {late === 1 ? "day" : "days"} late
                      </span>
                    </span>
                  </Td>
                  <Td>
                    <StatusTag status={o.status} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>

        <div className="md:hidden">
          {pagedOverdue.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-muted">Nothing is overdue.</p>
          )}
          {pagedOverdue.map(({ order: o, late, who, why }) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setViewing(o)}
              className="block w-full text-left px-5 py-3 border-b border-rule cursor-pointer"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="font-medium truncate">{o.customer_name}</span>
                <span className="text-negative text-sm whitespace-nowrap">
                  {late} {late === 1 ? "day" : "days"} late
                </span>
              </span>
              <span className="mt-0.5 flex items-center gap-2 text-[13px] text-muted">
                <span className="font-mono text-xs">{o.order_no}</span>·
                <span className="text-ink">{who}</span>·<span className="truncate">{why}</span>
              </span>
            </button>
          ))}
        </div>

        {overdueRows.length > 0 && (
          <div className="px-5 py-3">
            <Pagination
              page={overduePage}
              pageSize={OVERDUE_PAGE_SIZE}
              total={overdueRows.length}
              onChange={setOverduePage}
            />
          </div>
        )}
            </>
          ) : (
            <>
          <div className="hidden md:block [--edge:1.25rem]">
            <Table>
              <thead>
                <tr>
                  <Th className="w-[34%]">Job</Th>
                  <Th>Technician</Th>
                  <Th>Completed</Th>
                  <Th className="text-right">Final amount</Th>
                  <Th className="w-[1%]">
                    <span className="sr-only">Action</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={`skeleton-${i}`}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <Td key={j}>
                          <Skeleton className="h-4 w-full max-w-24" />
                        </Td>
                      ))}
                    </tr>
                  ))}
                {!loading && paginatedOrders.length === 0 && (
                  <tr>
                    <Td colSpan={5} className="!h-24 text-center text-muted">
                      {queue === "Job Done"
                        ? "Nothing is waiting for review."
                        : `No ${QUEUE_LABEL[queue].toLowerCase()} orders yet.`}
                    </Td>
                  </tr>
                )}
                {!loading &&
                  paginatedOrders.map((o) => {
                    const log = logs[o.id];
                    const tech = log?.technician_name ?? technicianName(o.assigned_technician_id);
                    return (
                      <tr key={o.id} className="hover:bg-raised">
                        <Td className="!h-14">
                          <button type="button" className="block text-left cursor-pointer" onClick={() => setViewing(o)}>
                            <span className="block font-medium hover:underline">{o.customer_name}</span>
                            <span className="block font-mono text-xs text-muted">{o.order_no}</span>
                          </button>
                        </Td>
                        <Td>
                          <span className="inline-flex items-center gap-2">
                            {tech !== "—" && <Avatar name={tech} names={techNames} />}
                            {tech}
                          </span>
                        </Td>
                        <Td>{log ? fmtDate(log.completed_at) : <span className="text-muted">—</span>}</Td>
                        <Td className="text-right">
                          {log ? <Money value={log.final_amount} /> : <span className="text-muted">—</span>}
                        </Td>
                        <Td className="text-right">{actionFor(o)}</Td>
                      </tr>
                    );
                  })}
              </tbody>
            </Table>
          </div>

          <div className="md:hidden">
            {loading &&
              Array.from({ length: 3 }).map((_, i) => (
                <div key={`m-skeleton-${i}`} className="px-5 py-3 border-b border-rule">
                  <Skeleton className="h-4 w-40 mb-2" />
                  <Skeleton className="h-3.5 w-52" />
                </div>
              ))}
            {!loading && paginatedOrders.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-muted">
                {queue === "Job Done"
                  ? "Nothing is waiting for review."
                  : `No ${QUEUE_LABEL[queue].toLowerCase()} orders yet.`}
              </p>
            )}
            {!loading &&
              paginatedOrders.map((o) => {
                const log = logs[o.id];
                const tech = log?.technician_name ?? technicianName(o.assigned_technician_id);
                return (
                  <div key={o.id} className="px-5 py-3 border-b border-rule">
                    <button type="button" className="w-full text-left cursor-pointer" onClick={() => setViewing(o)}>
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-medium truncate">{o.customer_name}</span>
                        {log && <Money value={log.final_amount} />}
                      </span>
                      <span className="mt-0.5 block text-[13px] text-muted">
                        <span className="font-mono text-xs">{o.order_no}</span> · {tech}
                        {log && ` · ${fmtDate(log.completed_at)}`}
                      </span>
                    </button>
                    {actionFor(o) && <div className="mt-2">{actionFor(o)}</div>}
                  </div>
                );
              })}
          </div>

          {!loading && queueOrders.length > 0 && (
            <div className="px-5 py-3">
              <Pagination page={page} pageSize={PAGE_SIZE} total={queueOrders.length} onChange={setPage} />
            </div>
          )}
            </>
          )}
        </Card>
      </div>

      <Dialog
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing && <span className="font-mono text-base">{viewing.order_no}</span>}
      >
        {viewing && (
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{viewing.customer_name}</div>
                <div className="text-sm text-muted">
                  {viewing.phone} · {viewing.address}
                </div>
              </div>
              <StatusTag status={viewing.status} />
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-lg bg-raised px-4 py-4">
              <Detail label="Service type">{viewing.service_type}</Detail>
              <Detail label="Technician">
                {viewingLog?.technician_name ?? technicianName(viewing.assigned_technician_id)}
              </Detail>
              <Detail label="Quoted price">
                <Money value={viewing.quoted_price} />
              </Detail>
              <Detail label="Extra charges">
                {viewingLog ? <Money value={viewingLog.extra_charges} /> : "—"}
              </Detail>
              <div className="col-span-2 border-t border-edge pt-3 flex items-baseline justify-between">
                <span className="text-sm text-muted">Final amount</span>
                <span className="text-lg font-semibold">
                  {viewingLog ? <Money value={viewingLog.final_amount} /> : "—"}
                </span>
              </div>
            </div>

            {viewing.problem_description && <Detail label="Problem reported">{viewing.problem_description}</Detail>}
            {viewing.admin_notes && <Detail label="Admin notes">{viewing.admin_notes}</Detail>}

            {viewingLog ? (
              <>
                <Detail label="Work done">{viewingLog.work_done || "—"}</Detail>
                <Detail label="Remarks">{viewingLog.remarks || "—"}</Detail>
                {viewingLog.attachments?.length > 0 && (
                  <div className="text-sm">
                    <div className="text-muted mb-1.5">Attachments ({viewingLog.attachments.length})</div>
                    <div className="flex gap-2 flex-wrap">
                      {viewingLog.attachments.map((url, i) =>
                        IMAGE_EXT.test(url) ? (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="block size-16 rounded-md border border-edge overflow-hidden"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={`Attachment ${i + 1}`} className="w-full h-full object-cover" />
                          </a>
                        ) : (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="grid place-items-center size-16 rounded-md border border-edge text-xs text-ink text-center p-1 hover:bg-raised"
                          >
                            File {i + 1}
                          </a>
                        )
                      )}
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted">Completed {fmtDateTime(viewingLog.completed_at)}</p>
              </>
            ) : (
              <p className="text-sm text-muted">No completion details recorded yet.</p>
            )}

            <div className="flex justify-end gap-2">
              <Button size="lg" className="max-sm:flex-1" onClick={() => setViewing(null)}>
                Done
              </Button>
              {viewing.status === "Job Done" && (
                <Button variant="primary" size="lg" className="max-sm:flex-1" onClick={() => handleReview(viewing.id)}>
                  Mark reviewed
                </Button>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

function Kpi({
  label,
  lead = false,
  className = "",
  onClick,
  children,
}: {
  label: string;
  lead?: boolean;
  className?: string;
  /** Makes the cell a shortcut (the Awaiting review cell jumps to the queue). */
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const inner = (
    <>
      <div className="text-sm font-medium text-muted">{label}</div>
      <div className={`mt-1 tabular-nums ${lead ? "text-4xl leading-10" : "text-[26px] leading-9"}`}>{children}</div>
    </>
  );
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={`px-5 py-4 min-w-0 text-left cursor-pointer transition-colors hover:bg-raised ${className}`}
    >
      {inner}
    </button>
  ) : (
    <div className={`px-5 py-4 min-w-0 ${className}`}>{inner}</div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="text-sm">
      <div className="text-muted mb-0.5">{label}</div>
      <div>{children}</div>
    </div>
  );
}
