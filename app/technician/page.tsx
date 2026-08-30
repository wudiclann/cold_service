"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  Inbox,
  MapPin,
  MessageCircle,
  Paperclip,
  Plus,
  X,
} from "lucide-react";
import { useRole } from "@/lib/role-context";
import { useTechnicians } from "@/lib/useTechnicians";
import { useToast } from "@/lib/toast-context";
import { supabase } from "@/lib/supabase/client";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import type { Order, ServiceLog } from "@/lib/types";
import { Blueprint } from "@/components/ui/Blueprint";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tag, StatusTag } from "@/components/ui/Tag";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/Input";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const MAX_ATTACHMENTS = 6;

export default function TechnicianPage() {
  const router = useRouter();
  const { role, technicianName, ready, setTechnicianName } = useRole();
  const { technicians } = useTechnicians();
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
    if (!ready) return;
    if (role !== "Technician") router.replace("/");
  }, [ready, role, router]);

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

  async function loadJobs() {
    if (!technicianId) return;
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
  }, [technicianId]);

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

  return (
    <div className="flex-1 flex flex-col items-center gap-3 p-5">
      <div className="w-full max-w-sm flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex items-center gap-0.5 text-xs text-black/45 hover:text-accent-700 cursor-pointer shrink-0"
        >
          <ChevronLeft size={13} strokeWidth={1.5} />
          Switch role
        </button>
        {technicians.length > 0 && (
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-black/45 shrink-0">Viewing as</label>
            <Select
              className="min-h-0 py-1 text-xs"
              value={technicianName ?? ""}
              onChange={(e) => switchTechnician(e.target.value)}
            >
              {technicians.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>
      <Blueprint className="w-full max-w-sm min-h-[640px] flex flex-col bg-bg">
        <div className="flex justify-between items-baseline px-4.5 py-4 border-b border-divider">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-black/45">Logged in as</div>
            <div className="font-heading font-semibold text-[17px]">{technicianName ?? "—"}</div>
          </div>
          <Tag variant="outline">Technician</Tag>
        </div>

        {!selected && (
          <div className="flex flex-col gap-3 p-4.5 flex-1">
            <div className="text-[11px] uppercase tracking-wide text-black/45">My jobs</div>
            {loading &&
              Array.from({ length: 2 }).map((_, i) => (
                <div key={`skeleton-${i}`} className="border border-divider p-4 flex flex-col gap-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-9 w-full mt-1.5" />
                </div>
              ))}
            {!loading && jobs.length === 0 && (
              <div className="flex flex-col items-center gap-1.5 py-8 text-black/40">
                <Inbox size={20} strokeWidth={1.5} className="text-black/25" />
                <p className="text-xs">No assigned jobs right now.</p>
              </div>
            )}
            {jobs.map((job) => (
              <div
                key={job.id}
                className={`border p-4 flex flex-col gap-2 ${
                  job.status === "Assigned" ? "border-accent" : "border-divider"
                }`}
              >
                <div className="flex justify-between">
                  <span className="font-heading font-semibold text-base">{job.order_no}</span>
                  <StatusTag status={job.status} />
                </div>
                <div className="text-sm">{job.customer_name}</div>
                <div className="flex items-center gap-1 text-xs text-black/55">
                  <MapPin size={12} strokeWidth={1.5} className="shrink-0" />
                  {job.address} · {job.service_type}
                </div>
                {job.problem_description && (
                  <div className="text-xs text-black/55 line-clamp-2">
                    Problem: {job.problem_description}
                  </div>
                )}
                <div className="flex items-center gap-1 text-xs text-black/45">
                  <CalendarClock size={12} strokeWidth={1.5} />
                  Due {new Date(job.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
                <Button
                  variant={job.status === "Assigned" ? "primary" : "secondary"}
                  block
                  className="mt-1.5 !py-3 text-sm"
                  onClick={() => openJob(job)}
                >
                  {job.status === "Assigned" ? "Open job" : "Continue job"}
                </Button>
              </div>
            ))}
          </div>
        )}

        {selected && !completedLog && (
          <>
            <div className="px-4.5 py-4 border-b border-divider">
              <div className="flex items-center justify-between">
                <button
                  className="flex items-center gap-0.5 text-xs text-black/45 cursor-pointer"
                  onClick={backToList}
                >
                  <ChevronLeft size={13} strokeWidth={1.5} />
                  Back
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-accent-700 hover:underline cursor-pointer"
                  onClick={openPostponeDialog}
                >
                  <CalendarClock size={13} strokeWidth={1.5} />
                  Postpone job
                </button>
              </div>
              <div className="font-heading font-semibold text-lg mt-1">
                {selected.order_no} · {selected.service_type}
              </div>
              <div className="flex items-center gap-1 text-xs text-black/55">
                <MapPin size={12} strokeWidth={1.5} className="shrink-0" />
                {selected.customer_name} · {selected.address}
              </div>
              <div className="flex items-center gap-1 text-xs text-black/45 mt-0.5">
                <CalendarClock size={12} strokeWidth={1.5} />
                Due{" "}
                {new Date(selected.due_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 p-4.5 flex-1 overflow-auto">
              {(selected.problem_description || selected.admin_notes) && (
                <div className="border border-divider p-2.5 flex flex-col gap-2">
                  {selected.problem_description && (
                    <div className="text-xs">
                      <div className="text-black/45 mb-0.5">Problem reported</div>
                      <div>{selected.problem_description}</div>
                    </div>
                  )}
                  {selected.admin_notes && (
                    <div className="text-xs">
                      <div className="text-black/45 mb-0.5">Admin notes</div>
                      <div>{selected.admin_notes}</div>
                    </div>
                  )}
                </div>
              )}
              <Field label="Work done">
                <Textarea value={workDone} onChange={(e) => setWorkDone(e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Quoted">
                  <Input
                    disabled
                    value={`RM ${Number(selected.quoted_price).toFixed(0)}`}
                    className="bg-neutral-100 text-black/60"
                  />
                </Field>
                <Field label="Extra charges">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={extraCharges}
                    onChange={(e) => setExtraCharges(e.target.value)}
                  />
                </Field>
              </div>
              <Field
                label={
                  <span className="inline-flex items-center gap-1">
                    <Paperclip size={11} strokeWidth={1.5} />
                    {`Attachments (up to ${MAX_ATTACHMENTS})`}
                  </span>
                }
              >
                <div className="flex gap-2 flex-wrap">
                  {files.map((f, i) => (
                    <div
                      key={i}
                      className="relative w-13 h-13 border border-divider flex items-center justify-center text-[9px] p-1 text-center break-all bg-surface"
                    >
                      {f.name}
                      <button
                        type="button"
                        className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 flex items-center justify-center bg-ink text-bg cursor-pointer"
                        onClick={() => setFiles(files.filter((_, fi) => fi !== i))}
                      >
                        <X size={9} strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                  {files.length < MAX_ATTACHMENTS && (
                    <label className="w-13 h-13 border border-dashed border-divider flex items-center justify-center text-accent cursor-pointer">
                      <Plus size={18} strokeWidth={1.5} />
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
              </Field>
              <Field label="Remarks">
                <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </Field>
              <div className="border border-divider p-2.5 text-xs text-black/55">
                Final amount = quoted + extra charges, computed on submit
              </div>
              {error && <p className="text-xs text-red-700">{error}</p>}
            </form>
            <div className="px-4.5 py-4 border-t border-divider">
              <Button
                variant="primary"
                marks
                block
                className="!py-3.5"
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting ? "Submitting…" : "Submit · mark Job Done"}
              </Button>
            </div>
          </>
        )}

        {selected && completedLog && (
          <div className="flex flex-col gap-3.5 p-5 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-accent-700">
              <CheckCircle2 size={13} strokeWidth={1.5} />
              Job Done
            </div>
            <h4 className="text-lg">{selected.order_no} completed</h4>
            <p className="text-sm text-black/60">
              Final amount:{" "}
              <span className="font-semibold text-ink">RM {Number(completedLog.final_amount).toFixed(0)}</span>
            </p>
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
            >
              <Button variant="primary" marks block className="!py-3">
                <MessageCircle size={15} strokeWidth={1.5} />
                Send WhatsApp update
              </Button>
            </a>
            <Button variant="secondary" block onClick={backToList}>
              Back to job list
            </Button>
          </div>
        )}
      </Blueprint>

      <Dialog open={postponeOpen} onClose={() => setPostponeOpen(false)} title="Postpone job">
        {selected && (
          <div className="flex flex-col gap-3.5">
            <p className="text-xs text-black/55">
              {selected.order_no} is currently due{" "}
              {new Date(selected.due_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
              . Pick a new date.
            </p>
            <Field label="New date">
              <Input
                type="date"
                min={todayIso()}
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
            </Field>
            <Button
              variant="primary"
              marks
              block
              disabled={postponing || !newDueDate}
              onClick={handlePostpone}
            >
              {postponing ? "Postponing…" : "Confirm postpone"}
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
