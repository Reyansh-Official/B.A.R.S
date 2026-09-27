import Link from "next/link";
import { connection } from "next/server";
import AutoRefresh from "@/components/AutoRefresh";
import SampleDataControls from "@/components/counselor/SampleDataControls";
import { isDemoMode } from "@/lib/demo-mode";
import { Badge, money } from "@/components/ui";
import { counselorStatus } from "@/lib/status";
import { requireCounselor } from "@/lib/auth";
import { listQueue } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";

const readinessTone = { ready: "good", missing_info: "warn", counselor_review: "info" } as const;
const screeningLabel = {
  presumptive: "Auto-qualified",
  potentially_eligible: "Eligible",
  hardship_review: "Hardship review",
  not_eligible_by_income: "Over income limit",
  counselor_review: "Counselor review",
} as const;
const shortDate = (iso: string) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default async function CounselorDashboard() {
  await connection();
  const counselor = await requireCounselor("/counselor");
  const apps = await listQueue(await createClient(), counselor.hospitalId);
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <AutoRefresh />
      <h1 className="text-2xl font-bold">Applications</h1>
      <p className="mb-4 text-slate-600">{apps.length} {apps.length === 1 ? "application" : "applications"}</p>
      <div className="mb-4 flex flex-col">
        <SampleDataControls demoMode={isDemoMode()} sampleCount={apps.filter((a) => a.sample).length} />
      </div>
      {apps.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          No applications yet. Submit one from the patient flow.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="p-3">Patient</th>
              <th className="p-3">Bills</th>
              <th className="p-3">Screening</th>
              <th className="p-3">Status</th>
              <th className="p-3">Readiness</th>
              <th className="p-3">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {apps.map((a) => (
              <tr key={a.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50">
                <td className="whitespace-nowrap p-3 font-medium">
                  <Link className="text-teal-800 hover:underline" href={`/counselor/${a.id}`}>{a.patientName}</Link>{a.sample && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-500">sample</span>}
                </td>
                <td className="whitespace-nowrap p-3 tabular-nums">
                  {money(a.bills.reduce((s, b) => s + b.amountOwed, 0))}
                  {a.bills.length > 1 && <span className="text-slate-400"> · {a.bills.length} bills</span>}
                </td>
                <td className="whitespace-nowrap p-3">
                  {a.eligibility.discountPct === 100 ? "Free care" : screeningLabel[a.eligibility.status]}
                  {a.eligibility.discountPct > 0 && a.eligibility.discountPct < 100 && <span className="text-slate-500"> · {a.eligibility.discountPct}% off</span>}
                </td>
                <td className="whitespace-nowrap p-3"><Badge tone={counselorStatus[a.status].tone}>{counselorStatus[a.status].text}</Badge></td>
                <td className="whitespace-nowrap p-3"><Badge tone={readinessTone[a.readiness]}>{a.readiness.replaceAll("_", " ")}</Badge></td>
                <td className="whitespace-nowrap p-3 tabular-nums text-slate-500">{shortDate(a.submittedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </main>
  );
}
