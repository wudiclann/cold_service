import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { canTransition, recordTransition } from "@/lib/orderTransitions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { technician_name } = await req.json();

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

  if (!canTransition(order.status, "In Progress")) {
    return NextResponse.json(
      { error: `Cannot start a job from status "${order.status}"` },
      { status: 409 }
    );
  }

  const { error } = await admin.from("orders").update({ status: "In Progress" }).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recordTransition(admin, id, order.status, "In Progress", "Technician");

  return NextResponse.json({ ok: true });
}
