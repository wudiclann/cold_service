import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { recordTransition } from "@/lib/orderTransitions";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    customer_name,
    phone,
    address,
    problem_description,
    service_type,
    quoted_price,
    assigned_technician_id,
    admin_notes,
    due_date,
  } = body;

  if (!customer_name || !phone || !address || !service_type || quoted_price == null || !due_date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (Number(quoted_price) < 0) {
    return NextResponse.json({ error: "quoted_price cannot be negative" }, { status: 400 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(due_date) < today) {
    return NextResponse.json({ error: "due_date cannot be in the past" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const { data: orderNo, error: orderNoError } = await admin.rpc("generate_order_no");
  if (orderNoError) {
    return NextResponse.json({ error: orderNoError.message }, { status: 500 });
  }

  const status = assigned_technician_id ? "Assigned" : "New";

  const { data: order, error } = await admin
    .from("orders")
    .insert({
      order_no: orderNo,
      customer_name,
      phone,
      address,
      problem_description: problem_description || null,
      service_type,
      quoted_price,
      assigned_technician_id: assigned_technician_id || null,
      admin_notes: admin_notes || null,
      status,
      due_date,
    })
    .select()
    .single();

  if (error || !order) {
    return NextResponse.json({ error: error?.message ?? "Failed to create order" }, { status: 500 });
  }

  if (status === "Assigned") {
    await recordTransition(admin, order.id, "New", "Assigned", "Admin");
  }

  return NextResponse.json({ order }, { status: 201 });
}
