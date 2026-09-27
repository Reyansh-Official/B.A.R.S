"use client";

import { useEffect, useState } from "react";
import Thread from "@/components/Thread";
import { Button, Card } from "@/components/ui";
import type { Application } from "@/lib/store";
import type { DocState, Policy } from "@/lib/types";
import CalendarButton from "./CalendarButton";
import { DocCard } from "./steps/Documents";

const stages = [
  { id: "submitted", label: "Sent to a counselor" },
  { id: "info_requested", label: "More information needed" },
  { id: "in_review", label: "Complete and being reviewed" },
] as const;

export default function ApplicationStatus({ id, token, policy }: { id: string; token: string; policy: Policy }) {
  const [app, setApp] = useState<Application | null>(null);
  const [denied, setDenied] = useState(false);
  const [changes, setChanges] = useState<Record<string, DocState | undefined>>({});
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const res = await fetch(`/api/applications/${id}`, { cache: "no-store", headers: { "x-access-token": token } });
      if (!alive) return;
      if (res.ok) setApp(await res.json());
      else if (res.status === 401) setDenied(true);
    };
    load();
    const t = setInterval(load, 3000);
    return () => { alive = false; clearInterval(t); };
  }, [id, token]);

  if (denied) {
    return (
      <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
        This link isn&apos;t valid. Use the private link you got after sending your application, or call {policy.contact.phone}.
      </p>
    );
  }
  if (!app) return <p className="text-slate-500">Loading your application…</p>;

  const open = app.status === "info_requested" ? (app.requests ?? []).findLast((r) => !r.resolvedAt) : undefined;
  const requested = open
    ? app.screening.readiness.documents
        .filter((d) => open.docIds.includes(d.id))
        .map((d) => {
          if (!(d.id in changes)) return d;
          const c = changes[d.id];
          return c ? { ...d, status: c.status, statusNote: c.note, files: c.files } : { ...d, status: "missing" as const, statusNote: undefined, files: undefined };
        })
    : [];
  const current = app.status === "responded" ? "submitted" : app.status;
  const reached = stages.findIndex((s) => s.id === current);

  const send = async () => {
    setSending(true);
    const docs = Object.fromEntries(Object.entries(changes).filter(([, v]) => v)) as Record<string, DocState>;
    const res = await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-access-token": token },
      body: JSON.stringify({ action: "respond", docs, message: reply }),
    });
    setSending(false);
    if (res.ok) {
      setApp(await res.json());
      setChanges({});
      setReply("");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="text-sm text-slate-500">Reference <span className="font-mono font-semibold text-slate-800">{app.id}</span></p>
        <ol className="mt-3 flex flex-col gap-2">
          {stages.map((s, i) => (
            <li key={s.id} className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${i <= reached ? (s.id === "info_requested" && current === "info_requested" ? "bg-amber-500" : "bg-teal-600") : "bg-slate-300"}`} />
              <span className={i <= reached ? "font-medium" : "text-slate-400"}>{s.label}</span>
            </li>
          ))}
        </ol>
        {app.status === "responded" && <p className="mt-3 text-sm text-emerald-700">Thanks! Your counselor has your update.</p>}
      </Card>

      {open && (
        <Card className="border-amber-300">
          <h2 className="font-semibold">Your counselor needs a few things</h2>
          <p className="mt-1 text-sm text-slate-600">Please respond by {new Date(open.dueBy).toLocaleDateString()}. You can reply by phone too.</p>
          <div className="mt-2"><CalendarButton date={open.dueBy} title={`Send documents to ${policy.name}`} details={`Your financial assistance counselor asked for more information. Respond here: ${typeof window === "undefined" ? "" : window.location.href}`} /></div>
        </Card>
      )}

      <Thread messages={app.messages} viewer="patient" />

      {open && (
        <>
          {requested.map((d) => (
            <DocCard key={d.id} doc={d} statedIncome={app.answers.annualIncome} set={(v) => setChanges((c) => ({ ...c, [d.id]: v }))} />
          ))}
          <textarea
            className="rounded-xl border border-slate-300 bg-white p-3 text-base"
            rows={3}
            placeholder="Add a note for your counselor (optional)"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
          <Button disabled={sending || (!Object.values(changes).some(Boolean) && !reply.trim())} onClick={send}>
            {sending ? "Sending…" : "Send to my counselor"}
          </Button>
        </>
      )}

      <p className="text-sm text-slate-600">
        {policy.name} gives a probable decision within {policy.timelines.probable_eligibility_business_days} business days and a final decision
        within {policy.timelines.final_determination_days} days of a complete application. Collections pause while it&apos;s reviewed. Questions? Call{" "}
        <a className="underline" href={`tel:${policy.contact.phone}`}>{policy.contact.phone}</a>.
      </p>
    </div>
  );
}
