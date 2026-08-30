import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrderStatus } from "./types";

export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  New: ["Assigned"],
  Assigned: ["In Progress"],
  "In Progress": ["Job Done"],
  "Job Done": ["Reviewed"],
  Reviewed: ["Closed"],
  Closed: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function recordTransition(
  admin: SupabaseClient,
  orderId: string,
  fromStatus: string | null,
  toStatus: OrderStatus,
  changedByRole: string
) {
  const { error } = await admin.from("status_history").insert({
    order_id: orderId,
    from_status: fromStatus,
    to_status: toStatus,
    changed_by_role: changedByRole,
  });
  if (error) throw error;
}
