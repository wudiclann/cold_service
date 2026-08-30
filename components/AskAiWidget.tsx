"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import { Blueprint } from "@/components/ui/Blueprint";
import { Button } from "@/components/ui/Button";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const EXAMPLES = [
  "What jobs did Ali complete last week?",
  "Which technician completed the most jobs this week?",
  "Which jobs are overdue?",
  "How do I create a new order?",
];

export function AskAiWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    const history = messages.slice(-6);
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, history }),
      });
      const json = await res.json().catch(() => ({}));
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: json.answer ?? "Something went wrong — please try again." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong — please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    ask(input);
  }

  if (!open) {
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <Button variant="primary" marks className="shadow-lg" onClick={() => setOpen(true)}>
          <Sparkles size={14} strokeWidth={1.5} />
          Ask AI
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-[360px] max-h-[80vh]">
      <Blueprint
        className="h-[500px] max-h-[80vh] bg-bg flex flex-col shadow-lg"
        style={{ animation: "panel-in 180ms ease-out" }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-divider">
          <div className="flex items-center gap-2">
            <Sparkles size={15} strokeWidth={1.5} className="text-accent-700" />
            <div>
              <div className="font-heading font-semibold text-sm">Ask about operations</div>
              <div className="text-[10px] text-black/45">Job data · how-to · overdue &amp; postponed</div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            className="text-black/40 hover:text-ink cursor-pointer shrink-0"
            onClick={() => setOpen(false)}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2.5">
          {messages.length === 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-black/45 mb-1">Try asking:</p>
              {EXAMPLES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => ask(q)}
                  className="text-left text-xs border border-divider px-2.5 py-1.5 hover:bg-accent-100 hover:border-accent cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              style={{ animation: "toast-in 150ms ease-out" }}
              className={`max-w-[85%] px-3 py-2 text-xs whitespace-pre-wrap ${
                m.role === "user" ? "self-end bg-accent text-bg" : "self-start bg-neutral-100 text-ink"
              }`}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="self-start flex items-center gap-1.5 bg-neutral-100 text-black/45 px-3 py-2 text-xs">
              <Loader2 size={12} strokeWidth={2} className="animate-spin" />
              Thinking…
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-1.5 p-3 border-t border-divider">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question…"
            className="flex-1 min-w-0 border border-divider bg-surface px-2.5 py-1.5 text-xs focus-visible:border-accent focus-visible:outline-none"
          />
          <Button type="submit" variant="primary" disabled={loading} className="!px-3 !py-1.5 text-xs">
            <Send size={13} strokeWidth={1.5} />
            Send
          </Button>
        </form>
      </Blueprint>
    </div>
  );
}
