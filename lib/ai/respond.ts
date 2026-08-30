import { openaiClient, AI_MODEL } from "./openai";
import type { AiIntent } from "./intent";
import type { QueryResult } from "./query";
import { SYSTEM_KNOWLEDGE } from "./systemKnowledge";

const UNSUPPORTED_MESSAGE =
  'I can answer questions about completed jobs, postponed/rescheduled jobs, and overdue jobs — for today, this week, or last week, optionally filtered by technician (Ali, Bala, John, Yusoff) — or how-to questions about using this system. Try something like "What jobs did Ali complete last week?" or "How do I create a new order?"';

export async function formatAnswer(question: string, intent: AiIntent, result: QueryResult): Promise<string> {
  if (intent.metric === "unsupported") {
    return UNSUPPORTED_MESSAGE;
  }

  const client = openaiClient();

  if (intent.metric === "help") {
    const completion = await client.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a help assistant for the Sejuk Sejuk Ops app, answering a user's question about how it works or how to use it. Answer using ONLY the reference below.

- For broad questions ("tell me about the system", "what is this app", "what can you do here"), give a helpful summary covering the roles and the overall order workflow — this is a normal, answerable question, not a reason to hedge.
- For specific how-to questions, be concise and practical, pointing to the exact button/screen/role involved.
- Only say you're not sure when the reference genuinely doesn't cover the specific detail asked about — never hedge on a question the reference can answer with a summary.

${SYSTEM_KNOWLEDGE}`,
        },
        { role: "user", content: question },
      ],
    });
    return completion.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response.";
  }
  const completion = await client.chat.completions.create({
    model: AI_MODEL,
    messages: [
      {
        role: "system",
        content:
          'You are an operations assistant for an aircon service company. Answer the manager\'s question using ONLY the JSON data provided — never invent figures, order numbers, or names not present in it. Be concise and factual, in the style of: "Technician Ali completed 3 jobs last week: ORDER1234 – Cleaning, ORDER1237 – Repair, ORDER1241 – Gas refill." Use RM for currency. If the data answers a "which technician did the most" style question, name the top technician explicitly by comparing the by_technician breakdown. If the same order number appears multiple times (e.g. an order postponed several times), summarize it as one item with a count ("ORDER1002, postponed 3 times") rather than repeating the order number in a list. If "rows" is empty, clearly tell the manager no matching records were found for that scope/period (mention the technician and/or period from the question if relevant) — do not invent any data to fill the gap.',
      },
      {
        role: "user",
        content: `Question: ${question}\n\nData: ${JSON.stringify(result)}`,
      },
    ],
  });

  return completion.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response.";
}
