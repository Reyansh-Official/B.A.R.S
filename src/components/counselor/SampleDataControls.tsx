"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SampleDataControls({ sampleCount, demoMode }: { sampleCount: number; demoMode: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = async (method: "POST" | "DELETE") => {
    setBusy(true);
    await fetch("/api/demo/sample", { method });
    setBusy(false);
    router.refresh();
  };
  return sampleCount > 0 ? (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
      <span><b>Includes {sampleCount} sample applications</b> (synthetic, for demonstration). Real applications are counted alongside them.</span>
      <button disabled={busy} onClick={() => run("DELETE")} className="font-semibold underline">Clear sample data</button>
    </div>
  ) : !demoMode ? null : (
    <button disabled={busy} onClick={() => run("POST")} className="self-start rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50">
      {busy ? "Loading…" : "Load sample data"}
    </button>
  );
}
