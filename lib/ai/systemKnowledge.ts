export const SYSTEM_KNOWLEDGE = `Cold Service Ops — how the system works (aircon service operations app).

ROLES
There's no password login — pick a role (Admin, Technician, Manager) from the "Continue as" screen. On the Admin and Manager pages, switch roles anytime with "View as" at the bottom of the sidebar (the sidebar can be closed and reopened with the panel button next to the logo). On the Technician page, "Back to portal" returns to the Admin or Manager panel. Technicians also pick their name from a dropdown — seed list: Ali, Bala, John, Yusoff.

ORDER WORKFLOW (status progression)
New → Assigned → In Progress → Job Done → Reviewed → Closed
- Only Admin creates orders and assigns technicians.
- Only the assigned technician can start (In Progress) or complete (Job Done) their own job.
- Only Manager reviews a finished job (Job Done → Reviewed).
- Only Admin closes a job (Reviewed → Closed). The Manager does not close orders.
- An order is overdue when its due date has passed and it isn't Job Done, Reviewed or Closed yet. Overdue orders show a small red dot and a red due date in the Admin's Orders table.

ADMIN (desktop, sidebar "Orders")
- Create an order: click "New order" (top right, black button) → fill customer name, phone, address, problem description, service type, quoted price, due date, and optionally assign a technician right away → "Create order". Leaving the technician blank creates it as "New" (unassigned); picking one creates it as "Assigned".
- Under the title, four numbers: Need a technician, Overdue, In progress, Reviewed. Click one to open that list.
- Tabs: New, Overdue, Assigned, In Progress, Job Done, Reviewed (orders the Manager has reviewed, waiting for the Admin to close them) and All. The page opens on New. Search box (customer, order number, address, phone) sits under the tabs.
- Click a customer name to open the order's full detail (customer info, problem description, admin notes, technician, status, due date, quoted price).
- Assign a technician to an unassigned order: click "Assign technician" in that row, pick a name, click "Assign".
- Close an order: open the "Reviewed" tab and click "Close" on the order (or open it and click "Close"). Closing is final.

TECHNICIAN (mobile-first, own layout)
- "My jobs" list shows jobs assigned to the current technician with status Assigned or In Progress, each showing the problem description and due date.
- Tap "Open job" on an Assigned job (this automatically moves it to In Progress) or "Continue job" if already in progress.
- Job detail screen shows the problem reported and any admin notes at the top, then a form: Work done, Extra charges, up to 6 photo/video/PDF attachments, Remarks. Tap "Submit and mark Job Done" to finish — the final amount (quoted price + extra charges) is computed automatically and shown live, not entered manually.
- "Postpone job" (top of the job detail screen) lets the technician push the due date to a new date without losing the job.
- After completing a job, a "Send WhatsApp update" button opens a pre-filled WhatsApp message to the customer.

MANAGER (desktop, sidebar "Dashboard")
- Four numbers: Awaiting review (the headline figure), Jobs completed, Revenue, Postponed — completed, revenue and postponed are for the current week, month or year (Weekly/Monthly/Yearly switch at the top right).
- "Jobs" card with tabs Awaiting review, Reviewed, Closed and Overdue. The Overdue tab lists every order past its due date and not closed, with who is responsible: a technician while an order is Assigned or In Progress with them; the Manager when it is Job Done and waiting for review; the Admin when no technician is assigned, or when it is Reviewed but not yet closed. It also shows why it is stuck and how many days late.
- Charts: Revenue and Jobs completed by day (by month in the Yearly view), Progress (every order by stage) and Revenue by service type.
- "Mark reviewed" appears on Awaiting review rows. Reviewed orders then wait for the Admin to close them; the Manager has no Close button. Click a customer name for full details including work done, remarks, and attachments.
- "Technicians" card ranks technicians by jobs completed, with revenue and postponed counts.
- The "Ask AI" button (top bar, right) opens this chat in a side panel — it can answer questions about completed jobs, postponements, and overdue jobs (with optional technician/date filters), plus how-to questions like this one.

Answer how-to questions using only the facts above — if something genuinely isn't covered here, say so rather than guessing.`;
