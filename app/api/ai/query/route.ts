import { NextRequest, NextResponse } from "next/server";
import { parseIntent, type AiIntent, type ChatMessage } from "@/lib/ai/intent";
import { runScopedQuery } from "@/lib/ai/query";
import { formatAnswer } from "@/lib/ai/respond";
import { checkRateLimit, getClientIp } from "@/lib/ai/rateLimit";
import { supabaseAdmin } from "@/lib/supabase/server";

const KNOWN_METRICS: AiIntent["metric"][] = [
  "completed_jobs",
  "postponements",
  "overdue",
  "help",
  "unsupported",
];
const NO_QUERY_METRICS: AiIntent["metric"][] = ["help", "unsupported"];
const KNOWN_RANGES: NonNullable<AiIntent["date_range"]>[] = ["today", "this_week", "last_week"];
const MAX_QUESTION_LENGTH = 500;

export async function POST(req: NextRequest) {
  const { question, history } = await req.json();

  if (!question || typeof question !== "string") {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { error: `question must be ${MAX_QUESTION_LENGTH} characters or fewer` },
      { status: 400 }
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      answer: "The AI assistant isn't configured yet — ask your admin to set OPENAI_API_KEY.",
    });
  }

  const ip = getClientIp(req.headers);
  const rateLimit = await checkRateLimit(ip);
  if (!rateLimit.allowed) {
    const minutes = Math.ceil((rateLimit.retryAfterSeconds ?? 60) / 60);
    return NextResponse.json(
      {
        answer: `You've asked a lot of questions in a short time — please wait about ${minutes} minute${
          minutes === 1 ? "" : "s"
        } before asking more.`,
      },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds ?? 60) } }
    );
  }

  try {
    const intent = await parseIntent(question, (history ?? []) as ChatMessage[]);

    // Server-side validation — defense in depth against a malformed/unexpected LLM response.
    if (!KNOWN_METRICS.includes(intent.metric)) {
      intent.metric = "unsupported";
    }
    if (intent.date_range && !KNOWN_RANGES.includes(intent.date_range)) {
      intent.date_range = "this_week";
    }
    if (intent.technician_name && !NO_QUERY_METRICS.includes(intent.metric)) {
      const admin = supabaseAdmin();
      const { data: tech } = await admin
        .from("technicians")
        .select("name")
        .ilike("name", intent.technician_name)
        .maybeSingle();
      intent.technician_name = tech?.name ?? null;
    }

    const result = NO_QUERY_METRICS.includes(intent.metric)
      ? { summary: {}, rows: [] }
      : await runScopedQuery(intent);
    const answer = await formatAnswer(question, intent, result);

    return NextResponse.json({ answer });
  } catch (err) {
    console.error("AI query failed", err);
    return NextResponse.json({ answer: "Something went wrong answering that — please try again." });
  }
}
