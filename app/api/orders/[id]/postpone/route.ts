import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const POSTPONABLE_STATUSES = ["Assigned", "In Progress"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { technician_name, new_due_date } = await req.json();

  if (!new_due_date) {
    return NextResponse.json({ error: "new_due_date is required" }, { status: 400 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(new_due_date) < today) {
    return NextResponse.json({ error: "new_due_date cannot be in the past" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const { data: order, error: fetchError } = await admin
    .from("orders")
    .select("status, assigned_technician_id")
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

  if (!POSTPONABLE_STATUSES.includes(order.status)) {
    return NextResponse.json(
      { error: `Cannot postpone a job from status "${order.status}"` },
      { status: 409 }
    );
  }

  const { error: updateError } = await admin.from("orders").update({ due_date: new_due_date }).eq("id", id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { error } = await admin.from("postponements").insert({
    order_id: id,
    technician_name,
    rescheduled_to: new_due_date,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, due_date: new_due_date });
}
