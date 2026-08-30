export function buildWhatsAppLink(params: {
  phone: string;
  customerName: string;
  orderNo: string;
  technicianName: string;
  completedAt: string;
}) {
  const { phone, customerName, orderNo, technicianName, completedAt } = params;
  const message =
    `Hi ${customerName}, Job ${orderNo} has been completed by Technician ` +
    `${technicianName} at ${completedAt}. Please check and leave feedback. Thank you!`;
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
