"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card } from "@/components/ui";

interface Band {
  maxPct: number;
  discount: number;
}

export default function PolicyReviewActions({ policyId, status, hasErrors, bands: initial, editableBands }: { policyId: string; status: string; hasErrors: boolean; bands: Band[]; editableBands: boolean }) {
  const router = useRouter();
  const [bands, setBands] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const changed = JSON.stringify(bands) !== JSON.stringify(initial);

  const act = async (body: object) => {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/admin/policies/${policyId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (!res.ok) return setError((await res.json()).error ?? "Something went wrong");
    router.refresh();
  };

  const setBand = (i: number, key: keyof Band, value: string) => setBands((b) => b.map((x, j) => (j === i ? { ...x, [key]: Number(value) } : x)));

  return (
    <>
      {editableBands && status === "draft" && (
        <Card>
          <h2 className="mb-1 font-semibold">Adjust income bands</h2>
          <p className="mb-3 text-xs text-slate-500">If the extractor picked the wrong table, fix it here. Dollar limits are recalculated from this year&apos;s poverty guidelines.</p>
          <div className="flex flex-col gap-2 text-sm">
            {bands.map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-10 text-slate-500">up to</span>
                <input type="number" aria-label={`Band ${i + 1} limit`} className="w-20 rounded border border-slate-300 px-2 py-1" value={b.maxPct} onChange={(e) => setBand(i, "maxPct", e.target.value)} />
                <span>% FPL →</span>
                <input type="number" aria-label={`Band ${i + 1} discount`} className="w-16 rounded border border-slate-300 px-2 py-1" value={b.discount} onChange={(e) => setBand(i, "discount", e.target.value)} />
                <span>% off</span>
                <button className="ml-auto text-xs text-slate-400 underline" onClick={() => setBands((x) => x.filter((_, j) => j !== i))}>remove</button>
              </div>
            ))}
            <button className="self-start text-xs text-teal-700 underline" onClick={() => setBands((x) => [...x, { maxPct: (x.at(-1)?.maxPct ?? 200) + 50, discount: 0 }])}>+ add band</button>
          </div>
          {changed && <Button onClick={() => act({ action: "save_bands", bands })} disabled={busy}>Save bands</Button>}
        </Card>
      )}

      <Card>
        <h2 className="mb-2 font-semibold">Decision</h2>
        {status === "approved" ? (
          <p className="text-sm text-emerald-700">Approved. Patients billed by this hospital are screened with this version.</p>
        ) : status === "draft" ? (
          <div className="flex flex-col gap-2">
            {hasErrors && <p className="text-sm text-rose-700">Fix the errors above before approving.</p>}
            {changed && <p className="text-sm text-amber-800">Save your band changes first.</p>}
            <Button onClick={() => act({ action: "approve" })} disabled={busy || hasErrors || changed}>Approve and go live</Button>
            <Button variant="secondary" onClick={() => act({ action: "reject" })} disabled={busy}>Reject</Button>
          </div>
        ) : (
          <p className="text-sm text-slate-600">This version is {status}.</p>
        )}
        {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
      </Card>
    </>
  );
}
