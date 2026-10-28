"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, Search, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useTechnicians } from "@/lib/useTechnicians";
import { useToast } from "@/lib/toast-context";
import { fmtDate } from "@/lib/format";
import { SERVICE_TYPES, isOverdue, type Order } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DatePicker } from "@/components/ui/DatePicker";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Money } from "@/components/ui/Money";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusTag, Tag } from "@/components/ui/Tag";
import { Table, Th, Td } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";

type Filter = "New" | "Overdue" | "Assigned" | "In Progress" | "Job Done" | "Reviewed" | "All";
// Ordered by what needs the admin first; All is the catch-all at the end.
const FILTERS: Filter[] = ["New", "Overdue", "Assigned", "In Progress", "Job Done", "Reviewed", "All"];
// The manager reviews; the admin closes. A Reviewed order is waiting on the admin.

const EMPTY_TEXT: Partial<Record<Filter, string>> = {
  New: "No new orders. Everything has a technician.",
  Overdue: "Nothing is overdue.",
  Reviewed: "Nothing is waiting to be closed.",
};
const PAGE_SIZE = 10;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().slice(0, 10);
}

const EMPTY_FORM = {
  customer_name: "",
  phone: "",
  address: "",
  problem_description: "",
  service_type: SERVICE_TYPES[0] as string,
  quoted_price: "",
  assigned_technician_id: "",
  admin_notes: "",
  due_date: "",
};

export default function AdminPage() {
  const { technicians } = useTechnicians();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("New");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignTechnicianId, setAssignTechnicianId] = useState("");
  const [viewing, setViewing] = useState<Order | null>(null);

  const techNames = technicians.map((t) => t.name);
  const technicianName = (id: string | null) => technicians.find((t) => t.id === id)?.name ?? null;

  async function loadOrders() {
    setLoading(true);
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    setOrders(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filter, query]);

  // Counts follow the view: they are computed from the rows the search leaves.
  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) =>
      [o.order_no, o.customer_name, o.address, o.phone, o.service_type].some((v) =>
        v?.toLowerCase().includes(q)
      )
    );
  }, [orders, query]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: searched.length, Overdue: 0 };
    for (const o of searched) {
      c[o.status] = (c[o.status] ?? 0) + 1;
      if (isOverdue(o)) c.Overdue += 1;
    }
    return c;
  }, [searched]);

  const visibleOrders =
    filter === "All"
      ? searched
      : filter === "Overdue"
        ? searched.filter(isOverdue)
        : searched.filter((o) => o.status === filter);
  const paginatedOrders = visibleOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  // Only draw the action column when a visible row has an action (no dead column otherwise).
  const showAction = paginatedOrders.some((o) => o.status === "Reviewed");

  const needAssigning = orders.filter((o) => o.status === "New").length;
  const overdue = orders.filter(isOverdue).length;
  const inProgress = orders.filter((o) => o.status === "In Progress").length;
  const reviewed = orders.filter((o) => o.status === "Reviewed").length;

  function showTab(next: Filter) {
    setQuery("");
    setFilter(next);
  }

  function openDialog() {
    setForm({ ...EMPTY_FORM, due_date: defaultDueDate() });
    setError(null);
    setDialogOpen(true);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          quoted_price: Number(form.quoted_price),
          assigned_technician_id: form.assigned_technician_id || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `Failed to create order (${res.status})`);
      setCreatedOrder(json.order);
      setForm(EMPTY_FORM);
      setDialogOpen(false);
      setFilter("All");
      setPage(1);
      showToast(`Order ${json.order.order_no} created`, "success");
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssign(orderId: string) {
    if (!assignTechnicianId) return;
    const techName = technicians.find((t) => t.id === assignTechnicianId)?.name ?? "technician";
    const res = await fetch(`/api/orders/${orderId}/assign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ technician_id: assignTechnicianId }),
    });
    if (res.ok) {
      setAssigningId(null);
      setAssignTechnicianId("");
      showToast(`${techName} assigned to the order`, "success");
      await loadOrders();
    } else {
      showToast("Failed to assign technician — please try again", "error");
    }
  }

  async function handleClose(order: Order) {
    const res = await fetch(`/api/orders/${order.id}/close`, { method: "PATCH" });
    if (res.ok) {
      setViewing(null);
      showToast(`${order.order_no} closed`, "success");
      await loadOrders();
    } else {
      showToast("Failed to close order — please try again", "error");
    }
  }

  function technicianCell(o: Order) {
    if (o.status === "New") {
      if (assigningId === o.id) {
        return (
          <div className="flex gap-1.5 items-center">
            <Select
              aria-label="Technician"
              className="!h-8 !text-sm w-36"
              value={assignTechnicianId}
              onChange={(e) => setAssignTechnicianId(e.target.value)}
            >
              <option value="">Choose…</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <Button variant="primary" disabled={!assignTechnicianId} onClick={() => handleAssign(o.id)}>
              Assign
            </Button>
            <Button variant="ghost" aria-label="Cancel" className="!px-2" onClick={() => setAssigningId(null)}>
              <X size={14} strokeWidth={1.75} />
            </Button>
          </div>
        );
      }
      return (
        <button
          type="button"
          className="text-sm font-medium text-ink underline decoration-control underline-offset-4 hover:decoration-ink cursor-pointer"
          onClick={() => setAssigningId(o.id)}
        >
          Assign technician
        </button>
      );
    }
    const name = technicianName(o.assigned_technician_id);
    return name ? (
      <span className="inline-flex items-center gap-2">
        <Avatar name={name} names={techNames} />
        {name}
      </span>
    ) : (
      <span className="text-muted">—</span>
    );
  }

  function dueCell(o: Order) {
    return (
      <span
        className={`inline-flex items-center gap-2 whitespace-nowrap ${isOverdue(o) ? "text-negative" : ""}`}
        title={isOverdue(o) ? "Overdue" : undefined}
      >
        {isOverdue(o) && <span className="size-1.5 rounded-full bg-negative" role="img" aria-label="Overdue" />}
        {fmtDate(o.due_date)}
      </span>
    );
  }

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-[22px] leading-7">Orders</h1>
        </div>
        <Button variant="dark" onClick={openDialog}>
          <Plus size={14} strokeWidth={2} />
          New order
        </Button>
      </div>

      {/* The pipeline at a glance: one card, four columns split by 1px rules. Each cell opens its tab. */}
      <Card className="grid grid-cols-2 lg:grid-cols-4 overflow-hidden">
        <StatCell
          label="Need a technician"
          lead
          count={loading ? undefined : needAssigning}
          active={filter === "New"}
          onClick={() => showTab("New")}
        />
        <StatCell
          label="Overdue"
          alert
          className="border-l border-edge"
          count={loading ? undefined : overdue}
          active={filter === "Overdue"}
          onClick={() => showTab("Overdue")}
        />
        <StatCell
          label="In progress"
          className="border-t lg:border-t-0 lg:border-l border-edge"
          count={loading ? undefined : inProgress}
          active={filter === "In Progress"}
          onClick={() => showTab("In Progress")}
        />
        <StatCell
          label="Reviewed"
          className="border-t border-l lg:border-t-0 border-edge"
          count={loading ? undefined : reviewed}
          active={filter === "Reviewed"}
          onClick={() => showTab("Reviewed")}
        />
      </Card>

      {createdOrder && (
        <div className="flex items-start gap-3 rounded-lg bg-raised border border-edge px-4 py-3 text-sm">
          <p className="flex-1">
            <span className="font-medium">{createdOrder.order_no}</span> created for{" "}
            {createdOrder.customer_name} · {createdOrder.service_type} ·{" "}
            <Money value={createdOrder.quoted_price} />. Status is{" "}
            <span className="font-medium">{createdOrder.status}</span>
            {createdOrder.assigned_technician_id &&
              `, assigned to ${technicianName(createdOrder.assigned_technician_id)}`}
            .
          </p>
          <button
            type="button"
            aria-label="Dismiss"
            className="text-muted hover:text-ink cursor-pointer"
            onClick={() => setCreatedOrder(null)}
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <Tabs
          value={filter}
          onChange={setFilter}
          options={FILTERS.map((f) => ({
            value: f,
            label: f,
            count: loading ? undefined : counts[f] ?? 0,
            alert: f === "Overdue" && (counts.Overdue ?? 0) > 0,
          }))}
        />

        <div className="flex items-center justify-between gap-3">
          {/* The search grows on focus and settles back when you leave it. */}
          <label className="relative block w-full sm:w-[280px] sm:focus-within:w-[340px] sm:transition-[width] sm:duration-300 sm:ease-out motion-reduce:transition-none">
            <span className="sr-only">Search orders</span>
            <Search
              size={14}
              strokeWidth={1.75}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
            <Input
              type="search"
              placeholder="Search order, customer or address"
              className="!h-8 pl-8"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <span className="hidden sm:block text-sm text-muted tabular-nums shrink-0">
            {loading ? "" : `${visibleOrders.length} ${visibleOrders.length === 1 ? "order" : "orders"}`}
          </span>
        </div>

        {/* Table from 768px up; two-line rows below. */}
        <div className="hidden md:block overflow-x-auto -mx-6">
          <Table>
            <thead>
              <tr>
                <Th className="w-[28%]">Customer</Th>
                <Th>Service</Th>
                <Th>Technician</Th>
                <Th>Due</Th>
                <Th>Status</Th>
                <Th className="text-right">Quoted</Th>
                {showAction && (
                  <Th className="w-[1%]">
                    <span className="sr-only">Action</span>
                  </Th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <Td key={j}>
                        <Skeleton className="h-4 w-full max-w-28" />
                      </Td>
                    ))}
                  </tr>
                ))}
              {!loading && paginatedOrders.length === 0 && (
                <tr>
                  <Td colSpan={6} className="!h-24 text-center text-muted">
                    {orders.length === 0
                      ? "No orders yet. Create the first one with New order."
                      : !query.trim() && EMPTY_TEXT[filter]
                        ? EMPTY_TEXT[filter]
                        : "No orders match this view."}
                  </Td>
                </tr>
              )}
              {!loading &&
                paginatedOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-raised">
                    <Td className="!h-14">
                      <button
                        type="button"
                        className="block text-left cursor-pointer"
                        onClick={() => setViewing(o)}
                      >
                        <span className="block font-medium hover:underline">{o.customer_name}</span>
                        <span className="block font-mono text-xs text-muted">{o.order_no}</span>
                      </button>
                    </Td>
                    <Td>{o.service_type}</Td>
                    <Td>
                      {technicianCell(o)}
                    </Td>
                    <Td>
                      {dueCell(o)}
                    </Td>
                    <Td>
                      <StatusTag status={o.status} />
                    </Td>
                    <Td className="text-right">
                      <Money value={o.quoted_price} />
                    </Td>
                    {showAction && (
                      <Td className="text-right">
                        {o.status === "Reviewed" && <Button onClick={() => handleClose(o)}>Close</Button>}
                      </Td>
                    )}
                  </tr>
                ))}
            </tbody>
          </Table>
        </div>

        <div className="md:hidden -mx-4 sm:-mx-6">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={`m-skeleton-${i}`} className="px-4 sm:px-6 py-3 border-b border-rule">
                <Skeleton className="h-4 w-40 mb-2" />
                <Skeleton className="h-3.5 w-56" />
              </div>
            ))}
          {!loading && paginatedOrders.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted">
              {orders.length === 0
                ? "No orders yet."
                : !query.trim() && EMPTY_TEXT[filter]
                  ? EMPTY_TEXT[filter]
                  : "No orders match this view."}
            </p>
          )}
          {!loading &&
            paginatedOrders.map((o) => (
              <div key={o.id} className="px-4 sm:px-6 py-3 border-b border-rule">
                <button type="button" className="w-full text-left cursor-pointer" onClick={() => setViewing(o)}>
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-medium truncate">{o.customer_name}</span>
                    <Money value={o.quoted_price} />
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 text-[13px] text-muted">
                    <span className="font-mono text-xs">{o.order_no}</span>·<span>{o.service_type}</span>·
                    {dueCell(o)}
                  </span>
                </button>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="text-[13px] min-w-0">
                    {technicianCell(o)}
                  </div>
                  <StatusTag status={o.status} />
                </div>
                {o.status === "Reviewed" && (
                  <div className="mt-2">
                    <Button onClick={() => handleClose(o)}>Close</Button>
                  </div>
                )}
              </div>
            ))}
        </div>

        <Pagination page={page} pageSize={PAGE_SIZE} total={visibleOrders.length} onChange={setPage} />
      </div>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="New order">
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Customer name">
            <Input
              required
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <Input
              required
              placeholder="+60123456789"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Input
              required
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Field>
          <Field label="Problem description" className="sm:col-span-2">
            <Textarea
              value={form.problem_description}
              onChange={(e) => setForm({ ...form, problem_description: e.target.value })}
            />
          </Field>
          <Field label="Service type">
            <Select
              value={form.service_type}
              onChange={(e) => setForm({ ...form, service_type: e.target.value })}
            >
              {SERVICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Quoted price (RM)">
            <Input
              required
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.quoted_price}
              onChange={(e) => setForm({ ...form, quoted_price: e.target.value })}
            />
          </Field>
          <Field label="Due date">
            <DatePicker
              min={todayIso()}
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
          </Field>
          <Field label="Assign technician">
            <Select
              value={form.assigned_technician_id}
              onChange={(e) => setForm({ ...form, assigned_technician_id: e.target.value })}
            >
              <option value="">Unassigned</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Admin notes" className="sm:col-span-2">
            <Textarea
              value={form.admin_notes}
              onChange={(e) => setForm({ ...form, admin_notes: e.target.value })}
            />
          </Field>
          {error && <p className="sm:col-span-2 text-sm text-negative">{error}</p>}
          <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
            <Button size="lg" className="max-sm:flex-1" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="lg" disabled={submitting} className="max-sm:flex-1">
              {submitting ? "Creating…" : "Create order"}
            </Button>
          </div>
        </form>
      </Dialog>

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
              <div className="flex items-center gap-1.5">
                {isOverdue(viewing) && <Tag variant="neg">Overdue</Tag>}
                <StatusTag status={viewing.status} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-lg bg-raised px-4 py-4 text-sm">
              <Detail label="Service type">{viewing.service_type}</Detail>
              <Detail label="Technician">{technicianName(viewing.assigned_technician_id) ?? "—"}</Detail>
              <Detail label="Quoted price">
                <Money value={viewing.quoted_price} />
              </Detail>
              <Detail label="Due">{fmtDate(viewing.due_date)}</Detail>
            </div>

            {viewing.problem_description && (
              <Detail label="Problem reported">{viewing.problem_description}</Detail>
            )}
            {viewing.admin_notes && <Detail label="Admin notes">{viewing.admin_notes}</Detail>}

            <div className="flex justify-end gap-2">
              <Button size="lg" className="max-sm:flex-1" onClick={() => setViewing(null)}>
                Done
              </Button>
              {viewing.status === "Reviewed" && (
                <Button variant="primary" size="lg" className="max-sm:flex-1" onClick={() => handleClose(viewing)}>
                  Close
                </Button>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

function StatCell({
  label,
  count,
  lead = false,
  alert = false,
  active,
  className = "",
  onClick,
}: {
  label: string;
  count?: number;
  lead?: boolean;
  alert?: boolean;
  active: boolean;
  className?: string;
  onClick: () => void;
}) {
  const hot = alert && (count ?? 0) > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`text-left px-5 py-4 min-w-0 cursor-pointer transition-colors hover:bg-raised ${
        active ? "bg-raised" : ""
      } ${className}`}
    >
      <div className="text-sm font-medium text-muted">{label}</div>
      <div
        className={`mt-1 tabular-nums ${lead ? "text-4xl leading-10" : "text-[26px] leading-9"} ${
          hot ? "text-negative" : ""
        }`}
      >
        {count === undefined ? <Skeleton className={lead ? "h-9 w-12" : "h-6 w-10"} /> : count}
      </div>
    </button>
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
