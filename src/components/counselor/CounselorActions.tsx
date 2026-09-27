"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import type { AppStatus } from "@/lib/store";
import type { MedicaidScreening } from "@/lib/types";

interface Props {
  appId: string;
  firstName: string;
  status: AppStatus;
  insured: boolean;
  medicaidStatus: MedicaidScreening;
  requestable: { id: string; label: string; note?: string }[];
}

export default function CounselorActions({ appId, firstName, status, insured, medicaidStatus, requestable }: Props) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>(requestable.map((d) => d.id));
  const [message, setMessage] = useState(
    requestable.length === 0
      ? ""
      : `Hi ${firstName}, thanks for applying. To finish reviewing your application, please send the item(s) below. If you don't have them, tap "I don't have this" to see what else we accept.`,
  );
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const act = async (body: object) => {
    setBusy(true);
    await fetch(`/api/applications/${appId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      {!insured && (
        <label className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium">Medicaid screening</span>
          <select
            className="rounded-lg border border-slate-300 bg-white px-2 py-1"
            value={medicaidStatus}
            disabled={busy}
            onChange={(e) => act({ action: "set_medicaid", status: e.target.value })}
          >
            <option value="unknown">Unknown</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </label>
      )}

      {status === "info_requested" ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Waiting for the patient to respond.</p>
      ) : (
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3">
          <p className="font-semibold">Request more information</p>
          {requestable.length === 0 && <p className="text-sm text-slate-500">No documents are outstanding. You can still send a message.</p>}
          {requestable.map((d) => (
            <label key={d.id} className="flex gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-teal-700"
                checked={picked.includes(d.id)}
                onChange={() => setPicked((p) => (p.includes(d.id) ? p.filter((x) => x !== d.id) : [...p, d.id]))}
              />
              <span>
                {d.label}
                {d.note && <span className="block text-slate-500">{d.note}</span>}
              </span>
            </label>
          ))}
          <textarea className="rounded-lg border border-slate-300 p-2 text-sm" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
          <Button
            disabled={busy || (!picked.length && !message.trim())}
            onClick={async () => { await act({ action: "request_info", docIds: picked, message }); setSent(true); }}
          >
            {busy ? "Sending…" : "Send request to patient"}
          </Button>
          {sent && <p className="text-sm text-emerald-700">Sent. The patient has 30 days to respond under the policy.</p>}
        </div>
      )}

      {status !== "in_review" && (
        <Button variant="secondary" disabled={busy} onClick={() => act({ action: "mark_in_review" })}>
          Mark as complete and in review
        </Button>
      )}
    </div>
  );
}
