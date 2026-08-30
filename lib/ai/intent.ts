import { openaiClient, AI_MODEL } from "./openai";

export interface AiIntent {
  metric: "completed_jobs" | "postponements" | "overdue" | "help" | "unsupported";
  date_range: "today" | "this_week" | "last_week" | null;
  technician_name: string | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are an intent parser for an aircon service operations system. Given a manager's question, extract a structured query. Do not answer the question yourself.

Known technicians: Ali, Bala, John, Yusoff.

Choose exactly one metric:
- "completed_jobs": ANY question about jobs that were completed/finished/done, service revenue, income, earnings, or comparisons of technicians' completed work. Requires a date_range.
- "postponements": questions about jobs that were postponed, rescheduled, or delayed. Requires a date_range.
- "overdue": questions about jobs that are late/overdue/past their due date right now. date_range must be null — overdue is always "right now", not a period.
- "help": questions about HOW to use this system — how a feature works, where to find something, what a button/screen does, the difference between roles, or the order workflow/status meanings. date_range and technician_name should be null unless a technician is genuinely relevant to the how-to question.
- "unsupported": the question isn't about this system's data or how it works at all — general chat, requests to take an action (create/assign/delete/edit something), or questions about unrelated people/topics.

Examples (question -> metric, date_range, technician_name):
- "How much revenue this week?" -> completed_jobs, this_week, null
- "What's our total revenue this week?" -> completed_jobs, this_week, null
- "How many jobs did we finish today?" -> completed_jobs, today, null
- "Which technician earned the most this week?" -> completed_jobs, this_week, null
- "What jobs did Ali complete last week?" -> completed_jobs, last_week, Ali
- "Any postponed jobs this week?" -> postponements, this_week, null
- "How many times did Bala reschedule jobs?" -> postponements, this_week, Bala
- "Which jobs are overdue?" -> overdue, null, null
- "How do I create a new order?" -> help, null, null
- "Where do I mark a job as reviewed?" -> help, null, null
- "How does the postpone feature work?" -> help, null, null
- "What's the difference between Admin and Manager?" -> help, null, null
- "What does the Overdue tag mean?" -> help, null, null
- "What's the weather today?" -> unsupported, null, null
- "Create a new order for John" -> unsupported, null, null

date_range must be exactly one of "today", "this_week", "last_week", or null. Default to "this_week" if a completed_jobs/postponements question doesn't specify a period.

technician_name: the technician's name if the question names one of the known technicians, otherwise null. Never guess a name that wasn't mentioned.`;

export async function parseIntent(question: string, history: ChatMessage[]): Promise<AiIntent> {
  const client = openaiClient();

  const completion = await client.chat.completions.create({
    model: AI_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: question },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "intent",
        strict: true,
        schema: {
          type: "object",
          properties: {
            metric: {
              type: "string",
              enum: ["completed_jobs", "postponements", "overdue", "help", "unsupported"],
            },
            date_range: {
              type: ["string", "null"],
              enum: ["today", "this_week", "last_week", null],
            },
            technician_name: { type: ["string", "null"] },
          },
          required: ["metric", "date_range", "technician_name"],
          additionalProperties: false,
        },
      },
    },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("No response from intent parser");
  return JSON.parse(raw) as AiIntent;
}
