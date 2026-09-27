"use client";

import { useLang } from "@/lib/i18n";
import type { Message } from "@/lib/store";

export default function Thread({ messages, viewer }: { messages: Message[]; viewer: "counselor" | "patient" }) {
  const { tr, lang } = useLang();
  if (!messages.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {messages.map((m, i) => (
        <div
          key={i}
          className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.from === viewer ? "self-end bg-teal-700 text-white" : "self-start bg-slate-100 text-slate-900"}`}
        >
          <p className="mb-0.5 text-xs opacity-70">
            {m.from === "counselor" ? tr("Financial counselor", "Consejero financiero") : tr("Patient", "Paciente")} · {new Date(m.at).toLocaleString(lang === "es" ? "es-US" : "en-US")}
          </p>
          {m.text}
        </div>
      ))}
    </div>
  );
}
