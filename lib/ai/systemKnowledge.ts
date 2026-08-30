export const SYSTEM_KNOWLEDGE = `Sejuk Sejuk Ops — how the system works (aircon service operations app).

ROLES
There's no password login — pick a role (Admin, Technician, Manager) from the "Continue as" screen. Switch roles anytime via the top-right role switcher (Admin/Manager pages) or "‹ Switch role" (Technician page). Technicians also pick their name from a dropdown ("Viewing as") — seed list: Ali, Bala, John, Yusoff.

ORDER WORKFLOW (status progression)
New → Assigned → In Progress → Job Done → Reviewed → Closed
- Only Admin creates orders and assigns technicians.
- Only the assigned technician can start (In Progress) or complete (Job Done) their own job.
- Only Manager can mark a job Reviewed, then Closed.
- A red "Overdue" tag appears (Admin's Orders table) when a job's due date has passed and it isn't Job Done/Reviewed/Closed yet.

ADMIN (desktop, top nav "Orders")
- Create an order: click "+ New order" (top right) → fill customer name, phone, address, problem description, service type, quoted price, due date, and optionally assign a technician right away → "Create order". Leaving the technician blank creates it as "New" (unassigned); picking one creates it as "Assigned".
- Orders table: filter chips (All/New/Assigned/In Progress/Job Done) at the top. Click any order number to open its full detail (customer info, problem description, admin notes, technician, status, due date, quoted price).
- Assign a technician to an unassigned order: click "Assign…" in that row's Technician column, pick a name, click "Go".

TECHNICIAN (mobile-first, own layout)
- "My jobs" list shows jobs assigned to the current technician with status Assigned or In Progress, each showing the problem description and due date.
- Tap "Open job" on an Assigned job (this automatically moves it to In Progress) or "Continue job" if already in progress.
- Job detail screen shows the problem reported and any admin notes at the top, then a form: Work done, Extra charges, up to 6 photo/video/PDF attachments, Remarks. Tap "Submit · mark Job Done" to finish — the final amount (quoted price + extra charges) is computed automatically, not entered manually.
- "Postpone job" (top of the job detail screen) lets the technician push the due date to a new date without losing the job.
- After completing a job, a "Send WhatsApp update" button opens a pre-filled WhatsApp message to the customer.

MANAGER (desktop, top nav "Dashboard")
- KPI cards: Jobs completed, Revenue, Awaiting review, Postponed — all for the current week.
- "Jobs per technician" bar chart and a Leaderboard (ranked by jobs completed, showing revenue and postponed counts) side by side.
- Job review table lists Job Done/Reviewed/Closed orders. Click an order number for full details including work done, remarks, and attachments. "Mark reviewed" appears on Job Done rows; "Close" appears on Reviewed rows.
- The floating "Ask AI" button (bottom right) opens this chat — it can answer questions about completed jobs, postponements, and overdue jobs (with optional technician/date filters), plus how-to questions like this one.

Answer how-to questions using only the facts above — if something genuinely isn't covered here, say so rather than guessing.`;
