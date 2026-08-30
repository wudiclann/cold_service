"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, Inbox, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useTechnicians } from "@/lib/useTechnicians";
import { useToast } from "@/lib/toast-context";
import { SERVICE_TYPES, isOverdue, type Order, type OrderStatus } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card, CardKicker } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusTag, Tag } from "@/components/ui/Tag";
import { Table, Th, Td } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/Input";

const FILTERS: ("All" | OrderStatus)[] = ["All", "New", "Assigned", "In Progress", "Job Done"];
const PAGE_SIZE = 8;

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
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignTechnicianId, setAssignTechnicianId] = useState("");
  const [viewing, setViewing] = useState<Order | null>(null);

  const technicianName = (id: string | null) => technicians.find((t) => t.id === id)?.name ?? "—";

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
  }, [filter]);

  const visibleOrders = filter === "All" ? orders : orders.filter((o) => o.status === filter);
  const pageCount = Math.max(1, Math.ceil(visibleOrders.length / PAGE_SIZE));
  const paginatedOrders = visibleOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

  return (
    <div className="flex flex-col gap-5.5 w-full">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-2xl">Orders</h2>
        <Button variant="primary" marks onClick={openDialog}>
          <Plus size={14} strokeWidth={2} />
          New order
        </Button>
      </div>

      {createdOrder && (
        <Card className="bg-neutral-100 relative">
          <button
            type="button"
            aria-label="Dismiss"
            className="absolute top-3 right-3 text-black/40 hover:text-ink cursor-pointer text-sm"
            onClick={() => setCreatedOrder(null)}
          >
            ×
          </button>
          <CardKicker>Order created</CardKicker>
          <h4 className="text-base mb-1.5">{createdOrder.order_no}</h4>
          <p className="text-xs text-black/60 mb-1">
            {createdOrder.customer_name} · {createdOrder.service_type} · RM{" "}
            {Number(createdOrder.quoted_price).toFixed(0)}
          </p>
          <p className="text-xs text-black/60">
            Status set to <span className="text-accent-700 font-semibold">{createdOrder.status}</span>
            {createdOrder.assigned_technician_id &&
              ` — ${technicianName(createdOrder.assigned_technician_id)} assigned.`}
          </p>
        </Card>
      )}

      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[11px] px-2.5 py-1 rounded-none cursor-pointer ${
              filter === f
                ? "border border-accent text-accent-700"
                : "bg-neutral-100 text-neutral-800 hover:bg-neutral-200"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-[720px]">
          <thead>
            <tr>
              <Th>Order</Th>
              <Th>Customer</Th>
              <Th>Service</Th>
              <Th>Technician</Th>
              <Th>Due</Th>
              <Th>Status</Th>
              <Th className="text-right">Quoted</Th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <Td key={j}>
                      <Skeleton className="h-3.5 w-full max-w-24" />
                    </Td>
                  ))}
                </tr>
              ))}
            {!loading && paginatedOrders.length === 0 && (
              <tr>
                <Td colSpan={7} className="text-center text-black/40 py-8">
                  <div className="flex flex-col items-center gap-1.5">
                    <Inbox size={20} strokeWidth={1.5} className="text-black/25" />
                    No orders yet.
                  </div>
                </Td>
              </tr>
            )}
            {!loading && paginatedOrders.map((o) => (
              <tr key={o.id}>
                <Td>
                  <button
                    className="text-accent-700 font-heading font-semibold cursor-pointer hover:underline"
                    onClick={() => setViewing(o)}
                  >
                    {o.order_no}
                  </button>
                </Td>
                <Td>{o.customer_name}</Td>
                <Td>{o.service_type}</Td>
                <Td>
                  {o.status === "New" ? (
                    assigningId === o.id ? (
                      <div className="flex gap-1.5">
                        <Select
                          className="min-h-0 py-1 text-xs"
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
                        <Button
                          variant="primary"
                          className="!px-2 !py-1 text-xs"
                          onClick={() => handleAssign(o.id)}
                        >
                          Go
                        </Button>
                      </div>
                    ) : (
                      <button
                        className="text-accent-700 text-xs font-heading font-semibold cursor-pointer hover:underline"
                        onClick={() => setAssigningId(o.id)}
                      >
                        Assign…
                      </button>
                    )
                  ) : (
                    technicianName(o.assigned_technician_id)
                  )}
                </Td>
                <Td>
                  {new Date(o.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </Td>
                <Td>
                  <div className="flex gap-1.5 flex-wrap">
                    <StatusTag status={o.status} />
                    {isOverdue(o) && (
                      <Tag variant="danger" icon={AlertTriangle}>
                        Overdue
                      </Tag>
                    )}
                  </div>
                </Td>
                <Td className="text-right">RM {Number(o.quoted_price).toFixed(0)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <Pagination page={page} pageCount={pageCount} onChange={setPage} />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="New order">
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
          <Field label="Quoted price">
            <Input
              required
              type="number"
              min="0"
              step="0.01"
              placeholder="RM"
              value={form.quoted_price}
              onChange={(e) => setForm({ ...form, quoted_price: e.target.value })}
            />
          </Field>
          <Field label="Due date" className="sm:col-span-2">
            <Input
              required
              type="date"
              min={todayIso()}
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
          </Field>
          <Field label="Assign technician" className="sm:col-span-2">
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
          {error && <p className="sm:col-span-2 text-xs text-red-700">{error}</p>}
          <Button
            type="submit"
            variant="primary"
            marks
            block
            disabled={submitting}
            className="sm:col-span-2 mt-1"
          >
            {submitting ? "Creating…" : "Create order"}
          </Button>
        </form>
      </Dialog>

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
                <div>{technicianName(viewing.assigned_technician_id)}</div>
              </div>
              <div>
                <div className="text-black/45 mb-0.5">Quoted price</div>
                <div>RM {Number(viewing.quoted_price).toFixed(0)}</div>
              </div>
              <div>
                <div className="text-black/45 mb-0.5">Due date</div>
                <div>
                  {new Date(viewing.due_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
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

            <Button variant="secondary" onClick={() => setViewing(null)}>
              Close
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
