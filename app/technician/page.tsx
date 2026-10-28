"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  MapPin,
  MessageCircle,
  Plus,
  X,
} from "lucide-react";
import { useRole } from "@/lib/role-context";
import { useTechnicians } from "@/lib/useTechnicians";
import { useToast } from "@/lib/toast-context";
import { supabase } from "@/lib/supabase/client";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { isOverdue, type Order, type Role, type ServiceLog } from "@/lib/types";
import { SetupNotice } from "@/components/SetupNotice";
import { Brand } from "@/components/shell/Brand";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Money } from "@/components/ui/Money";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusTag, Tag } from "@/components/ui/Tag";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const MAX_ATTACHMENTS = 6;

export default function TechnicianPage() {
  const router = useRouter();
  const { role, technicianName, ready, setRole, setTechnicianName } = useRole();
  const leaving = useRef(false);
  const { technicians, loading: techLoading } = useTechnicians();
  const { showToast } = useToast();

  const [jobs, setJobs] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);
  const [completedLog, setCompletedLog] = useState<ServiceLog | null>(null);

  const [workDone, setWorkDone] = useState("");
  const [extraCharges, setExtraCharges] = useState("0");
  const [remarks, setRemarks] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postponing, setPostponing] = useState(false);
  const [postponeOpen, setPostponeOpen] = useState(false);
  const [newDueDate, setNewDueDate] = useState("");

  useEffect(() => {
    if (!ready || leaving.current) return;
    if (role !== "Technician") router.replace("/");
  }, [ready, role, router]);

  // Back to the Admin/Manager panel the user came from (remembered by the app layout);
  // with none remembered (signed in straight as technician), default to Admin.
  // The role changes first, so the guard above must not bounce us to "/" mid-navigation.
  function backToPortal() {
    let last: string | null = null;
    try {
      last = sessionStorage.getItem("cold-service-last-panel");
    } catch {
      // storage unavailable — use the default
    }
    const panel: Role = last === "Manager" ? "Manager" : "Admin";
    leaving.current = true;
    setRole(panel);
    router.push(panel === "Admin" ? "/admin" : "/manager");
  }

  useEffect(() => {
    if (!technicianName && technicians.length > 0) {
      setTechnicianName(technicians[0].name);
    }
  }, [technicianName, technicians, setTechnicianName]);

  function switchTechnician(name: string) {
    setSelected(null);
    setCompletedLog(null);
    setTechnicianName(name);
  }

  const technicianId = technicians.find((t) => t.name === technicianName)?.id;
  const techNames = technicians.map((t) => t.name);

  async function loadJobs() {
    if (!technicianId) {
      // No technician to load for: once the list has loaded (and is empty) there is nothing to wait for.
      if (!techLoading) setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("assigned_technician_id", technicianId)
      .in("status", ["Assigned", "In Progress"])
      .order("created_at", { ascending: true });
    setJobs(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [technicianId, techLoading]);

  async function openJob(order: Order) {
    setError(null);
    setWorkDone("");
    setExtraCharges("0");
    setRemarks("");
    setFiles([]);
    setCompletedLog(null);

    if (order.status === "Assigned") {
      const res = await fetch(`/api/orders/${order.id}/start`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technician_name: technicianName }),
      });
      if (res.ok) {
        setSelected({ ...order, status: "In Progress" });
        return;
      }
      showToast("Failed to start job — please try again", "error");
    }
    setSelected(order);
  }

  function handleFilesChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...picked].slice(0, MAX_ATTACHMENTS));
    e.target.value = "";
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("work_done", workDone);
      fd.set("extra_charges", extraCharges || "0");
      fd.set("remarks", remarks);
      fd.set("technician_name", technicianName ?? "");
      files.forEach((f) => fd.append("attachments", f));

      const res = await fetch(`/api/orders/${selected.id}/complete`, { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `Failed to submit (${res.status})`);
      setCompletedLog(json.serviceLog);
      await loadJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  function backToList() {
    setSelected(null);
    setCompletedLog(null);
  }

  function openPostponeDialog() {
    if (!selected) return;
    const today = new Date();
    const dueDate = new Date(selected.due_date);
    const base = dueDate > today ? dueDate : today;
    base.setDate(base.getDate() + 2);
    setNewDueDate(base.toISOString().slice(0, 10));
    setPostponeOpen(true);
  }

  async function handlePostpone() {
    if (!selected || !newDueDate) return;
    setPostponing(true);
    try {
      const res = await fetch(`/api/orders/${selected.id}/postpone`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technician_name: technicianName, new_due_date: newDueDate }),
      });
      if (res.ok) {
        setPostponeOpen(false);
        showToast(`${selected.order_no} postponed to a new date`, "success");
        await loadJobs();
        backToList();
      } else {
        showToast("Failed to postpone job — please try again", "error");
      }
    } finally {
      setPostponing(false);
    }
  }

  if (!ready || role !== "Technician") return null;

  const finalAmount = selected ? Number(selected.quoted_price) + Number(extraCharges || 0) : 0;
  const newJobs = jobs.filter((j) => j.status === "Assigned").length;

  return (
    <div className="h-dvh flex flex-col items-center bg-ground">
      <div className="w-full max-w-[460px] flex-1 min-h-0 flex flex-col sm:py-3">
        <header className="shrink-0 flex items-center justify-between gap-3 h-12 px-4 sm:px-1">
          <Brand />
          <button
            type="button"
            onClick={backToPortal}
            className="group flex items-center h-9 text-sm text-muted hover:text-ink cursor-pointer"
          >
            <span className="flex items-center gap-0.5 border-b border-transparent pb-px group-hover:border-current">
              <ChevronLeft size={16} strokeWidth={1.5} />
              Back to portal
            </span>
          </button>
        </header>

        <SetupNotice className="rounded-lg border mb-2" />

        <div className="flex-1 min-h-0 flex flex-col bg-surface border-t sm:border border-edge sm:rounded-2xl overflow-hidden mt-1">
          <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-rule">
            {technicianName && <Avatar name={technicianName} names={techNames} size={36} />}
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{technicianName ?? "—"}</div>
              <div className="text-xs text-muted">Technician</div>
            </div>
            {technicians.length > 0 && (
              <Select
                aria-label="Viewing as"
                className="!h-8 !w-auto max-w-[150px]"
                value={technicianName ?? ""}
                onChange={(e) => switchTechnician(e.target.value)}
              >
                {technicians.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </Select>
            )}
          </div>

          {!selected && (
            <div className="relative flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              <div>
                <h1 className="text-[22px] leading-7">My jobs</h1>
                <p className="text-sm text-muted mt-1">
                  {loading
                    ? "Loading jobs…"
                    : jobs.length === 0
                      ? "No jobs assigned to you right now."
                      : newJobs > 0
                        ? `${jobs.length} ${jobs.length === 1 ? "job" : "jobs"}, ${newJobs} not started yet.`
                        : `${jobs.length} ${jobs.length === 1 ? "job" : "jobs"} in progress.`}
                </p>
              </div>

              {loading &&
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={`skeleton-${i}`} className="rounded-lg border border-edge p-4 flex flex-col gap-2.5">
                    <div className="flex justify-between">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-11 w-full mt-1" />
                  </div>
                ))}

              {jobs.map((job) => (
                <article
                  key={job.id}
                  className={`rounded-lg flex flex-col gap-2 ${
                    job.status === "Assigned"
                      ? "bg-surface border-2 border-ink p-[15px]"
                      : "border border-edge p-4"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base truncate">{job.customer_name}</h2>
                      <div className="text-xs text-muted">
                        <span className="font-mono">{job.order_no}</span> · {job.service_type}
                      </div>
                    </div>
                    <StatusTag status={job.status} />
                  </div>
                  <div className="flex items-start gap-1.5 text-sm text-muted">
                    <MapPin size={14} strokeWidth={1.5} className="shrink-0 mt-0.5" />
                    {job.address}
                  </div>
                  {job.problem_description && (
                    <p className="text-sm line-clamp-2">{job.problem_description}</p>
                  )}
                  <div className="flex items-center gap-1.5 text-sm text-muted">
                    <CalendarClock size={14} strokeWidth={1.5} />
                    Due {fmtDate(job.due_date)}
                    {isOverdue(job) && <Tag variant="neg">Overdue</Tag>}
                  </div>
                  <Button
                    variant={job.status === "Assigned" ? "primary" : "secondary"}
                    size="lg"
                    block
                    className="mt-1.5"
                    onClick={() => openJob(job)}
                  >
                    {job.status === "Assigned" ? "Open job" : "Continue job"}
                  </Button>
                </article>
              ))}
            </div>
          )}

          {selected && !completedLog && (
            <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
              <div className="relative flex-1 overflow-y-auto">
                <div className="px-4 py-3 border-b border-rule">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      className="group flex items-center h-9 text-sm text-muted hover:text-ink cursor-pointer"
                      onClick={backToList}
                    >
                      <span className="flex items-center gap-0.5 border-b border-transparent pb-px group-hover:border-current">
                        {/* the chevron has about 6px of empty space on its left; pull it out so the arrow lines up with the title */}
                        <ChevronLeft size={16} strokeWidth={1.5} className="-ml-1.5" />
                        Back
                      </span>
                    </button>
                    <button
                      type="button"
                      className="group flex items-center h-9 text-sm font-medium cursor-pointer"
                      onClick={openPostponeDialog}
                    >
                      <span className="flex items-center gap-1.5 border-b border-transparent pb-px group-hover:border-current">
                        <CalendarClock size={14} strokeWidth={1.5} />
                        Postpone job
                      </span>
                    </button>
                  </div>
                  <h1 className="text-lg leading-6 mt-1">{selected.customer_name}</h1>
                  <div className="text-xs text-muted mt-0.5">
                    <span className="font-mono">{selected.order_no}</span> · {selected.service_type}
                  </div>
                  <div className="flex items-start gap-1.5 text-sm text-muted mt-2">
                    <MapPin size={14} strokeWidth={1.5} className="shrink-0 mt-0.5" />
                    {selected.address}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted mt-1">
                    <CalendarClock size={14} strokeWidth={1.5} />
                    Due {fmtDate(selected.due_date)}
                    {isOverdue(selected) && <Tag variant="neg">Overdue</Tag>}
                  </div>
                </div>

                <div className="p-4 flex flex-col gap-4">
                  {(selected.problem_description || selected.admin_notes) && (
                    <div className="rounded-lg bg-raised p-3.5 flex flex-col gap-3 text-sm">
                      {selected.problem_description && (
                        <div>
                          <div className="text-muted mb-0.5">Problem reported</div>
                          <div>{selected.problem_description}</div>
                        </div>
                      )}
                      {selected.admin_notes && (
                        <div>
                          <div className="text-muted mb-0.5">Admin notes</div>
                          <div>{selected.admin_notes}</div>
                        </div>
                      )}
                    </div>
                  )}

                  <Field label="Work done">
                    <Textarea
                      value={workDone}
                      onChange={(e) => setWorkDone(e.target.value)}
                      placeholder="What did you do on site?"
                    />
                  </Field>

                  <Field label="Extra charges (RM)">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      className="!h-11"
                      value={extraCharges}
                      onChange={(e) => setExtraCharges(e.target.value)}
                    />
                  </Field>

                  <dl className="rounded-lg border border-edge text-sm">
                    <div className="flex justify-between px-3.5 py-2.5">
                      <dt className="text-muted">Quoted</dt>
                      <dd>
                        <Money value={selected.quoted_price} />
                      </dd>
                    </div>
                    <div className="flex justify-between px-3.5 py-2.5 border-t border-rule">
                      <dt className="text-muted">Extra charges</dt>
                      <dd>
                        <Money value={Number(extraCharges || 0)} />
                      </dd>
                    </div>
                    <div className="flex justify-between px-3.5 py-2.5 border-t border-edge font-medium">
                      <dt>Final amount</dt>
                      <dd>
                        <Money value={finalAmount} />
                      </dd>
                    </div>
                  </dl>

                  <div>
                    <div className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                      Attachments
                      <span className="font-normal text-muted">
                        {files.length} of {MAX_ATTACHMENTS}
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {files.map((f, i) => (
                        <div
                          key={i}
                          className="relative size-16 rounded-md border border-edge bg-raised flex items-center justify-center text-[11px] p-1 text-center break-all overflow-hidden"
                        >
                          {f.name}
                          <button
                            type="button"
                            aria-label={`Remove ${f.name}`}
                            className="absolute top-0.5 right-0.5 size-5 grid place-items-center rounded-full bg-ink text-white cursor-pointer"
                            onClick={() => setFiles(files.filter((_, fi) => fi !== i))}
                          >
                            <X size={11} strokeWidth={2} />
                          </button>
                        </div>
                      ))}
                      {files.length < MAX_ATTACHMENTS && (
                        <label className="size-16 rounded-md border border-dashed border-control grid place-items-center text-muted hover:text-ink hover:bg-raised cursor-pointer">
                          <span className="sr-only">Add attachment</span>
                          <Plus size={20} strokeWidth={1.5} />
                          <input
                            type="file"
                            multiple
                            accept="image/*,video/*,application/pdf"
                            className="hidden"
                            onChange={handleFilesChange}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <Field label="Remarks">
                    <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                  </Field>

                  {error && <p className="text-sm text-negative">{error}</p>}
                </div>
              </div>

              <div className="shrink-0 p-4 border-t border-edge bg-surface">
                <Button type="submit" variant="primary" size="lg" block disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit and mark Job Done"}
                </Button>
              </div>
            </form>
          )}

          {selected && completedLog && (
            <div className="relative flex-1 overflow-y-auto p-5 flex flex-col gap-5">
              <div className="flex items-center gap-2 text-sm font-medium text-positive">
                <CheckCircle2 size={18} strokeWidth={1.75} />
                Job Done
              </div>
              <div>
                <h1 className="text-[22px] leading-7">
                  <span className="font-mono text-lg">{selected.order_no}</span> completed
                </h1>
                <p className="text-sm text-muted mt-1">
                  Submitted {fmtDateTime(completedLog.completed_at)}. It now waits for the manager’s review.
                </p>
              </div>
              <div className="rounded-lg bg-raised px-4 py-3.5">
                <div className="text-sm text-muted">Final amount</div>
                <div className="text-[28px] leading-9">
                  <Money value={completedLog.final_amount} />
                </div>
              </div>
              <a
                href={buildWhatsAppLink({
                  phone: selected.phone,
                  customerName: selected.customer_name,
                  orderNo: selected.order_no,
                  technicianName: technicianName ?? "",
                  completedAt: new Date(completedLog.completed_at).toLocaleString(),
                })}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 h-11 rounded-md bg-accent text-white text-[15px] font-medium hover:bg-[#0066b8]"
              >
                <MessageCircle size={16} strokeWidth={1.5} />
                Send WhatsApp update
              </a>
              <Button size="lg" block onClick={backToList}>
                Back to job list
              </Button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={postponeOpen} onClose={() => setPostponeOpen(false)} title="Postpone job">
        {selected && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">
              <span className="font-mono">{selected.order_no}</span> is due {fmtDate(selected.due_date)}. Pick a new
              date.
            </p>
            <Field label="New date">
              <DatePicker
                min={todayIso()}
                className="!h-11"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
            </Field>
            <Button variant="primary" size="lg" block disabled={postponing || !newDueDate} onClick={handlePostpone}>
              {postponing ? "Postponing…" : "Confirm postpone"}
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
