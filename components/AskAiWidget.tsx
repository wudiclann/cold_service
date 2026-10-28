"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, Send, Sparkles, X } from "lucide-react";
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

export function AskAiWidget({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 sm:inset-auto sm:top-2 sm:right-2 sm:bottom-2 sm:w-[400px]">
      <aside
        aria-label="Ask about operations"
        className="h-full flex flex-col bg-surface sm:rounded-xl sm:border border-edge sm:shadow-xl"
        style={{ animation: "drawer-in 180ms ease-out" }}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-rule">
          <div className="flex items-start gap-2.5">
            <Sparkles size={16} strokeWidth={1.5} className="text-accent mt-0.5" />
            <div>
              <h2 className="text-base">Ask about operations</h2>
              <p className="text-xs text-muted mt-0.5">Job data, how-to, overdue and postponed work.</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            className="size-8 -mr-1.5 -mt-1 grid place-items-center rounded-md text-muted hover:bg-active hover:text-ink cursor-pointer shrink-0"
            onClick={onClose}
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
          {messages.length === 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted mb-1">Try asking</p>
              {EXAMPLES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => ask(q)}
                  className="text-left text-sm rounded-md border border-edge px-3 py-2 hover:bg-raised hover:border-control cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[88%] px-3 py-2 text-sm whitespace-pre-wrap rounded-lg ${
                m.role === "user" ? "self-end bg-accent text-white" : "self-start bg-raised text-ink"
              }`}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="self-start flex items-center gap-2 bg-raised text-muted px-3 py-2 text-sm rounded-lg">
              <Loader2 size={14} strokeWidth={2} className="animate-spin" />
              Thinking…
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t border-rule">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question…"
            aria-label="Question"
            className="flex-1 min-w-0 h-10 border border-control rounded-md bg-surface px-3 text-sm hover:border-muted focus-visible:border-accent"
          />
          <Button type="submit" variant="primary" disabled={loading} className="!h-10">
            <Send size={14} strokeWidth={1.5} />
            Send
          </Button>
        </form>
      </aside>
    </div>
  );
}
