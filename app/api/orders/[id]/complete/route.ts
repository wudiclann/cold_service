import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { canTransition, recordTransition } from "@/lib/orderTransitions";

const MAX_ATTACHMENTS = 6;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const formData = await req.formData();

  const work_done = String(formData.get("work_done") ?? "");
  const extra_charges = Number(formData.get("extra_charges") ?? 0);
  const remarks = String(formData.get("remarks") ?? "");
  const technician_name = String(formData.get("technician_name") ?? "");
  const files = formData.getAll("attachments").filter((f): f is File => f instanceof File);

  if (files.length > MAX_ATTACHMENTS) {
    return NextResponse.json({ error: `Max ${MAX_ATTACHMENTS} attachments` }, { status: 400 });
  }

  if (Number.isNaN(extra_charges) || extra_charges < 0) {
    return NextResponse.json({ error: "extra_charges cannot be negative" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const { data: order, error: fetchError } = await admin
    .from("orders")
    .select("status, assigned_technician_id, quoted_price")
    .eq("id", id)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.assigned_technician_id) {
    const { data: tech } = await admin
      .from("technicians")
      .select("name")
      .eq("id", order.assigned_technician_id)
      .single();
    if (tech && tech.name !== technician_name) {
      return NextResponse.json({ error: "This job is assigned to a different technician" }, { status: 403 });
    }
  }

  if (!canTransition(order.status, "Job Done")) {
    return NextResponse.json(
      { error: `Cannot complete a job from status "${order.status}"` },
      { status: 409 }
    );
  }

  const attachmentUrls: string[] = [];
  for (const [i, file] of files.entries()) {
    const path = `${id}/${Date.now()}-${i}-${file.name}`;
    const { error: uploadError } = await admin.storage
      .from("attachments")
      .upload(path, file, { contentType: file.type });
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }
    const { data: publicUrl } = admin.storage.from("attachments").getPublicUrl(path);
    attachmentUrls.push(publicUrl.publicUrl);
  }

  const final_amount = Number(order.quoted_price) + extra_charges;

  const { data: serviceLog, error: logError } = await admin
    .from("service_logs")
    .insert({
      order_id: id,
      work_done,
      extra_charges,
      final_amount,
      remarks,
      technician_name,
      attachments: attachmentUrls,
    })
    .select()
    .single();

  if (logError || !serviceLog) {
    return NextResponse.json({ error: logError?.message ?? "Failed to save service log" }, { status: 500 });
  }

  const { error: updateError } = await admin.from("orders").update({ status: "Job Done" }).eq("id", id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await recordTransition(admin, id, order.status, "Job Done", "Technician");

  return NextResponse.json({ serviceLog });
}
