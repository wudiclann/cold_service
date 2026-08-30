"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle2, Clock, Eye, Inbox, Trophy, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useTechnicians } from "@/lib/useTechnicians";
import { useToast } from "@/lib/toast-context";
import type { Order, ServiceLog, OrderStatus } from "@/lib/types";
import { AskAiWidget } from "@/components/AskAiWidget";
import { Button } from "@/components/ui/Button";
import { Card, CardKicker } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusTag, Tag } from "@/components/ui/Tag";
import { Table, Th, Td } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { Seg } from "@/components/ui/Seg";

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|heic)$/i;

interface Kpi {
  totals: { jobs_completed: number; revenue: number; awaiting_review: number; postponed: number };
  byTechnician: {
    technician_name: string;
    jobs_completed: number;
    total_amount: number;
    postponed: number;
  }[];
}

const REVIEW_STATUSES: OrderStatus[] = ["Job Done", "Reviewed", "Closed"];

interface ChartRow {
  technician_name: string;
  jobs_completed: number;
  total_amount: number;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartRow }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-bg border border-divider px-3 py-2 text-xs shadow-sm">
      <div className="font-heading font-semibold mb-0.5">{d.technician_name}</div>
      <div className="text-black/60">
        {d.jobs_completed} {d.jobs_completed === 1 ? "job" : "jobs"} · RM {d.total_amount.toFixed(0)}
      </div>
    </div>
  );
}
const PAGE_SIZE = 8;

export default function ManagerPage() {
  const { technicians } = useTechnicians();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [logs, setLogs] = useState<Record<string, ServiceLog>>({});
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<Order | null>(null);
  const [range, setRange] = useState<"week" | "month">("week");

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

  useEffect(() => {
    loadKpi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const aTime = new Date(logs[a.id]?.completed_at ?? a.updated_at).getTime();
      const bTime = new Date(logs[b.id]?.completed_at ?? b.updated_at).getTime();
      return bTime - aTime;
    });
  }, [orders, logs]);

  const pageCount = Math.max(1, Math.ceil(sortedOrders.length / PAGE_SIZE));
  const paginatedOrders = sortedOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [orders.length]);

  async function handleReview(id: string) {
    const res = await fetch(`/api/orders/${id}/review`, { method: "PATCH" });
    if (res.ok) {
      setViewing((v) => (v && v.id === id ? { ...v, status: "Reviewed" } : v));
      showToast("Order marked as reviewed", "success");
      await loadOrders();
      await loadKpi();
    } else {
      showToast("Failed to mark order as reviewed — please try again", "error");
    }
  }

  async function handleClose(id: string) {
    const res = await fetch(`/api/orders/${id}/close`, { method: "PATCH" });
    if (res.ok) {
      setViewing(null);
      showToast("Order closed", "success");
      await loadOrders();
      await loadKpi();
    } else {
      showToast("Failed to close order — please try again", "error");
    }
  }

  const viewingLog = viewing ? logs[viewing.id] : undefined;

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

  return (
    <div className="flex flex-col gap-5.5 w-full pb-20">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-2xl">{range === "week" ? "This week" : "This month"}</h2>
        <Seg<"week" | "month">
          options={[
            { value: "week", label: "Weekly" },
            { value: "month", label: "Monthly" },
          ]}
          value={range}
          onChange={setRange}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-1.5 text-[11px] text-black/50 mb-1.5">
            <CheckCircle2 size={13} strokeWidth={1.5} />
            Jobs completed
          </div>
          <div className="font-heading text-[30px] font-semibold">{kpi?.totals.jobs_completed ?? "—"}</div>
        </Card>
        <Card>
          <div className="flex items-center gap-1.5 text-[11px] text-black/50 mb-1.5">
            <Wallet size={13} strokeWidth={1.5} />
            Revenue
          </div>
          <div className="font-heading text-[30px] font-semibold">
            {kpi ? `RM ${kpi.totals.revenue.toFixed(0)}` : "—"}
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-1.5 text-[11px] text-black/50 mb-1.5">
            <Eye size={13} strokeWidth={1.5} />
            Awaiting review
          </div>
          <div className="font-heading text-[30px] font-semibold text-accent-700">
            {kpi?.totals.awaiting_review ?? "—"}
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-1.5 text-[11px] text-black/50 mb-1.5">
            <Clock size={13} strokeWidth={1.5} />
            Postponed
          </div>
          <div className="font-heading text-[30px] font-semibold text-accent-700">
            {kpi?.totals.postponed ?? "—"}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="pt-4.5">
          <CardKicker className="mb-0.5">Jobs per technician</CardKicker>
          <p className="text-[11px] text-black/45 mb-3.5">
            Completed jobs {range === "week" ? "this week" : "this month"}, by technician
          </p>
          <div className="h-[190px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leaderboard} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(29,31,32,0.1)" />
                <XAxis
                  dataKey="technician_name"
                  tick={{ fontSize: 11, fill: "#1d1f20" }}
                  axisLine={{ stroke: "rgba(29,31,32,0.16)" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, maxJobs + 1]}
                  tick={{ fontSize: 11, fill: "rgba(29,31,32,0.5)" }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip cursor={{ fill: "rgba(89,128,166,0.08)" }} content={<ChartTooltip />} />
                <Bar dataKey="jobs_completed" fill="#5980a6" radius={0} maxBarSize={40}>
                  <LabelList
                    dataKey="jobs_completed"
                    position="top"
                    style={{ fontSize: 11, fontWeight: 600, fill: "#1d1f20" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="pt-4.5">
          <CardKicker className="mb-3.5">Leaderboard</CardKicker>
          <div className="flex flex-col">
            {leaderboard.map((t, i) => {
              const isLeader = i === 0 && t.jobs_completed > 0;
              const pct = t.jobs_completed > 0 ? Math.max((t.jobs_completed / maxJobs) * 100, 6) : 0;
              return (
                <div
                  key={t.technician_name}
                  className={`flex items-center gap-3 py-2.5 ${i > 0 ? "border-t border-divider" : ""}`}
                >
                  <div
                    className={`w-5 shrink-0 flex items-center justify-center font-heading font-semibold text-sm ${
                      isLeader ? "text-accent-700" : "text-black/35"
                    }`}
                  >
                    {isLeader ? <Trophy size={14} strokeWidth={1.5} /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-heading font-semibold text-sm truncate">
                        {t.technician_name}
                      </span>
                      {t.postponed > 0 && (
                        <Tag variant="danger" className="!text-[9px] !px-1.5 !py-0">
                          {t.postponed} postponed
                        </Tag>
                      )}
                    </div>
                    <div className="h-1.5 bg-neutral-200 mt-1.5 overflow-hidden">
                      <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-heading font-semibold text-sm">{t.jobs_completed} jobs</div>
                    <div className="text-[11px] text-black/45">RM {t.total_amount.toFixed(0)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-[640px]">
          <thead>
            <tr>
              <Th>Order</Th>
              <Th>Technician</Th>
              <Th>Final amount</Th>
              <Th>Completed</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <Td key={j}>
                      <Skeleton className="h-3.5 w-full max-w-24" />
                    </Td>
                  ))}
                </tr>
              ))}
            {!loading && paginatedOrders.length === 0 && (
              <tr>
                <Td colSpan={6} className="text-center text-black/40 py-8">
                  <div className="flex flex-col items-center gap-1.5">
                    <Inbox size={20} strokeWidth={1.5} className="text-black/25" />
                    No completed jobs yet.
                  </div>
                </Td>
              </tr>
            )}
            {!loading && paginatedOrders.map((o) => {
              const log = logs[o.id];
              return (
                <tr key={o.id}>
                  <Td>
                    <button
                      className="text-accent-700 font-heading font-semibold cursor-pointer hover:underline"
                      onClick={() => setViewing(o)}
                    >
                      {o.order_no}
                    </button>
                  </Td>
                  <Td>{log?.technician_name ?? technicianName(o.assigned_technician_id)}</Td>
                  <Td>{log ? `RM ${Number(log.final_amount).toFixed(0)}` : "—"}</Td>
                  <Td>
                    {log
                      ? new Date(log.completed_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </Td>
                  <Td>
                    <StatusTag status={o.status} />
                  </Td>
                  <Td className="text-right">
                    {o.status === "Job Done" && (
                      <Button
                        variant="secondary"
                        className="!px-2.5 !py-1.5 text-xs"
                        onClick={() => handleReview(o.id)}
                      >
                        Mark reviewed
                      </Button>
                    )}
                    {o.status === "Reviewed" && (
                      <Button
                        variant="secondary"
                        className="!px-2.5 !py-1.5 text-xs"
                        onClick={() => handleClose(o.id)}
                      >
                        Close
                      </Button>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>

      <Pagination page={page} pageCount={pageCount} onChange={setPage} />

      <Dialog open={!!viewing} onClose={() => setViewing(null)} title={viewing?.order_no}>
        {viewing && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-sm font-semibold">{viewing.customer_name}</div>
                <div className="text-xs text-black/55">
                  {viewing.phone} · {viewing.address}
                </div>
              </div>
              <StatusTag status={viewing.status} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-black/45 mb-0.5">Service type</div>
                <div>{viewing.service_type}</div>
              </div>
              <div>
                <div className="text-black/45 mb-0.5">Technician</div>
                <div>{viewingLog?.technician_name ?? technicianName(viewing.assigned_technician_id)}</div>
              </div>
              <div>
                <div className="text-black/45 mb-0.5">Quoted price</div>
                <div>RM {Number(viewing.quoted_price).toFixed(0)}</div>
              </div>
              <div>
                <div className="text-black/45 mb-0.5">Extra charges</div>
                <div>{viewingLog ? `RM ${Number(viewingLog.extra_charges).toFixed(0)}` : "—"}</div>
              </div>
              <div className="col-span-2">
                <div className="text-black/45 mb-0.5">Final amount</div>
                <div className="font-heading font-semibold text-base">
                  {viewingLog ? `RM ${Number(viewingLog.final_amount).toFixed(0)}` : "—"}
                </div>
              </div>
            </div>

            {viewing.problem_description && (
              <div className="text-xs">
                <div className="text-black/45 mb-0.5">Problem reported</div>
                <div>{viewing.problem_description}</div>
              </div>
            )}

            {viewing.admin_notes && (
              <div className="text-xs">
                <div className="text-black/45 mb-0.5">Admin notes</div>
                <div>{viewing.admin_notes}</div>
              </div>
            )}

            {viewingLog ? (
              <>
                <div className="text-xs">
                  <div className="text-black/45 mb-0.5">Work done</div>
                  <div>{viewingLog.work_done || "—"}</div>
                </div>
                <div className="text-xs">
                  <div className="text-black/45 mb-0.5">Remarks</div>
                  <div>{viewingLog.remarks || "—"}</div>
                </div>
                {viewingLog.attachments?.length > 0 && (
                  <div className="text-xs">
                    <div className="text-black/45 mb-1.5">
                      Attachments ({viewingLog.attachments.length})
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {viewingLog.attachments.map((url, i) =>
                        IMAGE_EXT.test(url) ? (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="block w-16 h-16 border border-divider overflow-hidden"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </a>
                        ) : (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center w-16 h-16 border border-divider text-[10px] text-accent-700 text-center p-1 break-all hover:bg-accent-100"
                          >
                            File {i + 1}
                          </a>
                        )
                      )}
                    </div>
                  </div>
                )}
                <div className="text-xs text-black/45">
                  Completed {new Date(viewingLog.completed_at).toLocaleString()}
                </div>
              </>
            ) : (
              <p className="text-xs text-black/40">No completion details recorded yet.</p>
            )}

            <div className="flex gap-2 pt-1">
              {viewing.status === "Job Done" && (
                <Button variant="primary" onClick={() => handleReview(viewing.id)}>
                  Mark reviewed
                </Button>
              )}
              {viewing.status === "Reviewed" && (
                <Button variant="primary" onClick={() => handleClose(viewing.id)}>
                  Close
                </Button>
              )}
              <Button variant="secondary" onClick={() => setViewing(null)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      <AskAiWidget />
    </div>
  );
}
