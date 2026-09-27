"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RunRemindersButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const run = async () => {
    setBusy(true);
    const res = await fetch("/api/reminders/run", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setResult(res.ok ? `Checked ${data.applications}, sent ${data.sent}` : "Run failed");
    setBusy(false);
    router.refresh();
  };
  return (
    <div className="flex items-center gap-3">
      {result && <span className="text-sm text-slate-600">{result}</span>}
      <button onClick={run} disabled={busy} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50">
        {busy ? "Checking…" : "Send due reminders now"}
      </button>
    </div>
  );
}
