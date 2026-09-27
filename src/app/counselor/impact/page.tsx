import { connection } from "next/server";
import type { ReactNode } from "react";
import AutoRefresh from "@/components/AutoRefresh";
import SampleDataControls from "@/components/counselor/SampleDataControls";
import { computeMetrics } from "@/lib/metrics";
import { counselorStatus } from "@/lib/status";
import type { AppStatus } from "@/lib/store";
import { listApplications } from "@/lib/store";

// Categorical slots 1-4 of the validated reference palette, in fixed order (adjacent pairs pass CVD checks).
const statusColor: Record<AppStatus, string> = {
  submitted: "#2a78d6",
  info_requested: "#eb6834",
  responded: "#1baf7a",
  in_review: "#eda100",
};
const statusOrder: AppStatus[] = ["submitted", "info_requested", "responded", "in_review"];

function Tile({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function Tip({ children }: { children: ReactNode }) {
  return (
    <span role="tooltip" className="pointer-events-none absolute -top-9 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white group-hover:block">
      {children}
    </span>
  );
}

const hours = (h: number | null) => (h == null ? "–" : h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} days`);

export default async function ImpactPage() {
  await connection();
  const m = computeMetrics(listApplications());
  const maxReason = Math.max(1, ...m.followUpReasons.map((r) => r.count));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
      <AutoRefresh ms={5000} />
      <div>
        <h1 className="text-2xl font-bold">Impact</h1>
        <p className="text-slate-600">Is CareClear getting applications to review-ready with less back-and-forth?</p>
      </div>
      <SampleDataControls sampleCount={m.sampleCount} />

      {m.total === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">No applications yet.</p>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Tile label="Complete on first submission" value={m.completeFirstTimePct == null ? "–" : `${m.completeFirstTimePct}%`} sub="Nothing missing when the patient hit send" />
            <Tile label="Follow-up requests per application" value={m.followUpsPerApp ?? "–"} sub="Counselor requests for more information" />
            <Tile label="Median time to review-ready" value={hours(m.medianHoursToReview)} sub={`From submission to in review · ${m.reviewedCount} reached review`} />
            <Tile label="Applications" value={m.total} sub="Submitted through CareClear" />
          </section>

          <section>
            <h2 className="mb-2 font-semibold">Handled before a counselor stepped in</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <Tile label="Documents checked on upload" value={m.docsChecked} sub={`${m.docsFlagged} flagged to the patient right away`} />
              <Tile label="Missing documents replaced" value={m.alternativesUsed} sub="With alternatives the policy accepts, e.g. FAF 116" />
              <Tile label="Physician bills routed" value={m.billsRouted} sub="Sent to the physician group's own program" />
              <Tile label="Qualified automatically" value={m.presumptive} sub="SNAP, WIC, Medicaid, energy assistance" />
              <Tile label="Pointed to Medicaid first" value={m.medicaidFirst} sub="Uninsured and within reach of Medicaid, which can cover the whole visit" />
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="font-semibold">Where applications stand</h2>
              <p className="mb-4 text-sm text-slate-500">{m.total} applications</p>
              <div className="flex h-8 w-full gap-[2px]" role="img" aria-label="Applications by status">
                {statusOrder.filter((s) => m.statusCounts[s] > 0).map((s) => (
                  <div
                    key={s}
                    className="group relative h-full first:rounded-l last:rounded-r"
                    style={{ width: `${(m.statusCounts[s] / m.total) * 100}%`, background: statusColor[s] }}
                  >
                    <Tip>{counselorStatus[s].text}: {m.statusCounts[s]} ({Math.round((m.statusCounts[s] / m.total) * 100)}%)</Tip>
                  </div>
                ))}
              </div>
              <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {statusOrder.map((s) => (
                  <li key={s} className="flex items-center gap-2 text-slate-700">
                    <span className="h-3 w-3 rounded-sm" style={{ background: statusColor[s] }} />
                    {counselorStatus[s].text} <span className="ml-auto tabular-nums text-slate-900">{m.statusCounts[s]}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="font-semibold">Why follow-up was needed</h2>
              <p className="mb-4 text-sm text-slate-500">Documents counselors had to request</p>
              {m.followUpReasons.length === 0 ? (
                <p className="text-sm text-slate-500">No follow-up requests yet.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {m.followUpReasons.map((r) => (
                    <li key={r.label} className="text-sm">
                      <p className="mb-1 text-slate-700">{r.label}</p>
                      <div className="flex items-center gap-2">
                        <div className="group relative h-3 rounded-r" style={{ width: `${(r.count / maxReason) * 85}%`, background: "#2a78d6" }}>
                          <Tip>{r.count} request{r.count === 1 ? "" : "s"}</Tip>
                        </div>
                        <span className="tabular-nums text-slate-900">{r.count}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <p className="text-slate-600">Estimated patient balance reductions screened</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">${m.screenedReduction.toLocaleString()}</p>
              <p className="mt-1 text-xs text-slate-500">Screening estimates under the policy, not approvals. Charity care is not revenue.</p>
            </div>
            <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-800">Measured in a pilot, not estimated</p>
              <p className="mt-1">Counselor minutes per application and the share of applications that stall are compared against your current process during a pilot. We don&apos;t claim savings we haven&apos;t measured.</p>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
