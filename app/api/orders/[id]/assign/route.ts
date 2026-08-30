import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { canTransition, recordTransition } from "@/lib/orderTransitions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { technician_id } = await req.json();

  if (!technician_id) {
    return NextResponse.json({ error: "technician_id is required" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const { data: order, error: fetchError } = await admin
    .from("orders")
    .select("status")
    .eq("id", id)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!canTransition(order.status, "Assigned")) {
    return NextResponse.json(
      { error: `Cannot assign a technician from status "${order.status}"` },
      { status: 409 }
    );
  }

  const { error } = await admin
    .from("orders")
    .update({ assigned_technician_id: technician_id, status: "Assigned" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recordTransition(admin, id, order.status, "Assigned", "Admin");

  return NextResponse.json({ ok: true });
}
