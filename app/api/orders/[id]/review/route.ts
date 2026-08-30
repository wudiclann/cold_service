import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { canTransition, recordTransition } from "@/lib/orderTransitions";

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = supabaseAdmin();

  const { data: order, error: fetchError } = await admin
    .from("orders")
    .select("status")
    .eq("id", id)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!canTransition(order.status, "Reviewed")) {
    return NextResponse.json(
      { error: `Cannot review a job from status "${order.status}"` },
      { status: 409 }
    );
  }

  const { error } = await admin.from("orders").update({ status: "Reviewed" }).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recordTransition(admin, id, order.status, "Reviewed", "Manager");

  return NextResponse.json({ ok: true });
}
