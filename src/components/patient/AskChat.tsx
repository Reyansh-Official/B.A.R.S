"use client";

import { MessageCircleQuestion, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Cite {
  doc: number;
  page: number;
  quote: string;
}
interface Segment {
  text: string;
  cites: Cite[];
}
interface Turn {
  role: "user" | "assistant";
  text: string;
  segments?: Segment[];
  docs?: { title: string; url: string }[];
  error?: boolean;
}

const SUGGESTIONS = [
  "Can they send my bill to collections while I apply?",
  "Why is my doctor's bill separate?",
  "I don't have pay stubs. What can I do?",
  "What happens if I'm denied?",
];

function Answer({ turn }: { turn: Turn }) {
  if (!turn.segments) return <p className="whitespace-pre-wrap">{turn.text}</p>;
  return (
    <p className="whitespace-pre-wrap">
      {turn.segments.map((s, i) =>
        s.cites.length ? (
          // A claim backed by the policy: underlined, with a link to the page. The hover text is the policy's
          // exact wording (the claim itself is Claude's plain-language restatement, so it isn't shown as a quote).
          <span key={i}>
            <span className="underline decoration-teal-400 decoration-dotted underline-offset-4">{s.text.trim()}</span>{" "}
            {[...new Map(s.cites.map((c) => [`${c.doc}-${c.page}`, c])).values()].map((c) => (
              <a
                key={`${c.doc}-${c.page}`}
                href={`${turn.docs?.[c.doc]?.url ?? "#"}${c.page ? `#page=${c.page}` : ""}`}
                target="_blank"
                rel="noreferrer"
                title={`Policy says: "${c.quote}"`}
                className="mx-0.5 inline-block rounded bg-teal-100 px-1.5 text-[11px] font-semibold not-italic text-teal-800 no-underline"
              >
                {c.page ? `p.${c.page}` : "source"}
              </a>
            ))}{" "}
          </span>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </p>
  );
}

// Answers come only from the hospital's approved policy documents, with page citations; it explains, never decides.
export default function AskChat({ hospitalId, hospitalName, phone, context }: { hospitalId: string; hospitalName: string; phone: string; context: string }) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, open]);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setInput("");
    setBusy(true);
    const history = turns.filter((t) => !t.error).map((t) => ({ role: t.role, content: t.text }));
    setTurns((t) => [...t, { role: "user", text: q }, { role: "assistant", text: "" }]);
    const patchLast = (patch: Partial<Turn>) => setTurns((t) => [...t.slice(0, -1), { ...t[t.length - 1], ...patch }]);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospitalId, question: q, history, context }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        patchLast({ text: data.error ?? `Sorry, I couldn't answer that. You can call ${phone}.`, error: true });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let text = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.type === "text") patchLast({ text: (text += event.text) });
          if (event.type === "done") patchLast({ text, segments: event.segments, docs: event.docs });
          if (event.type === "error") patchLast({ text: event.message, error: true });
        }
      }
    } catch {
      patchLast({ text: `Something went wrong. You can call ${phone}.`, error: true });
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-teal-700 px-4 py-3 font-semibold text-white shadow-lg hover:bg-teal-800"
      >
        <MessageCircleQuestion className="h-5 w-5" aria-hidden /> Ask about my bill
      </button>
    );
  }

  return (
    <div role="dialog" aria-label="Ask about my bill" className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:bottom-5 sm:right-5 sm:left-auto sm:mx-0 sm:rounded-3xl">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
        <div>
          <p className="font-semibold text-slate-900">Ask about my bill</p>
          <p className="text-xs text-slate-500">Answers come from {hospitalName}&apos;s published policy. A counselor makes the final decision.</p>
        </div>
        <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-1 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
        {turns.length === 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-slate-600">Try asking:</p>
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => ask(s)} className="rounded-xl border border-slate-200 px-3 py-2 text-left text-slate-700 hover:bg-slate-50">{s}</button>
            ))}
          </div>
        )}
        {turns.map((t, i) =>
          t.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-2xl bg-teal-700 px-3 py-2 text-white">{t.text}</div>
          ) : (
            <div key={i} className={`max-w-[95%] rounded-2xl px-3 py-2 ${t.error ? "bg-rose-50 text-rose-800" : "bg-slate-100 text-slate-900"}`}>
              {t.text ? <Answer turn={t} /> : <span className="inline-flex items-center gap-2 text-slate-500"><span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" /> Reading the policy…</span>}
            </div>
          ),
        )}
        <div ref={bottom} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="flex gap-2 border-t border-slate-100 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          placeholder="Ask in any language…"
          aria-label="Your question"
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-base"
        />
        <button disabled={busy || !input.trim()} aria-label="Send" className="rounded-xl bg-teal-700 px-3 text-white disabled:opacity-50"><Send className="h-4 w-4" /></button>
      </form>
      <p className="px-4 pb-3 text-[11px] text-slate-400">Not legal advice. Don&apos;t share your Social Security number here. Questions? Call {phone}.</p>
    </div>
  );
}
