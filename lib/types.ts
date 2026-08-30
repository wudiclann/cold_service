export type OrderStatus =
  | "New"
  | "Assigned"
  | "In Progress"
  | "Job Done"
  | "Reviewed"
  | "Closed";

export type Role = "Admin" | "Technician" | "Manager";

export interface Technician {
  id: string;
  name: string;
}

export interface Order {
  id: string;
  order_no: string;
  customer_name: string;
  phone: string;
  address: string;
  problem_description: string | null;
  service_type: string;
  quoted_price: number;
  assigned_technician_id: string | null;
  admin_notes: string | null;
  status: OrderStatus;
  due_date: string;
  created_at: string;
  updated_at: string;
}

const ACTIVE_STATUSES: OrderStatus[] = ["New", "Assigned", "In Progress"];

export function isOverdue(order: Pick<Order, "status" | "due_date">): boolean {
  if (!ACTIVE_STATUSES.includes(order.status)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(order.due_date) < today;
}

export interface ServiceLog {
  id: string;
  order_id: string;
  work_done: string | null;
  extra_charges: number;
  final_amount: number;
  remarks: string | null;
  technician_name: string;
  completed_at: string;
  attachments: string[];
}

export interface StatusHistory {
  id: string;
  order_id: string;
  from_status: string | null;
  to_status: string;
  changed_by_role: string;
  changed_at: string;
}

export interface Postponement {
  id: string;
  order_id: string;
  technician_name: string;
  postponed_at: string;
  rescheduled_to: string | null;
}

export const SERVICE_TYPES = ["Cleaning", "Repair", "Installation", "Gas Refill"] as const;
