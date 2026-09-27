import Link from "next/link";
import { connection } from "next/server";
import AutoRefresh from "@/components/AutoRefresh";
import { Badge, money } from "@/components/ui";
import { counselorStatus } from "@/lib/status";
import { listApplications } from "@/lib/store";

const readinessTone = { ready: "good", missing_info: "warn", counselor_review: "info" } as const;

export default async function CounselorDashboard() {
  await connection();
  const apps = listApplications();
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <AutoRefresh />
      <h1 className="text-2xl font-bold">Financial assistance queue</h1>
      <p className="mb-6 text-slate-600">{apps.length} application(s)</p>
      {apps.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          No applications yet. Submit one from the patient flow.
        </p>
      ) : (
        <table className="w-full overflow-hidden rounded-xl bg-white text-left text-sm shadow-sm">
          <thead className="bg-slate-100 text-slate-600">
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
              <tr key={a.id} className="border-t border-slate-100">
                <td className="p-3 font-medium">
                  <Link className="text-teal-700 underline" href={`/counselor/${a.id}`}>{a.patient.name}</Link>
                </td>
                <td className="p-3">{money(a.bills.reduce((s, b) => s + b.amountOwed, 0))} ({a.bills.length})</td>
                <td className="p-3">{a.screening.eligibility.status.replaceAll("_", " ")} · {a.screening.eligibility.discountPct}%</td>
                <td className="p-3"><Badge tone={counselorStatus[a.status].tone}>{counselorStatus[a.status].text}</Badge></td>
                <td className="p-3"><Badge tone={readinessTone[a.screening.readiness.status]}>{a.screening.readiness.status.replaceAll("_", " ")}</Badge></td>
                <td className="p-3 text-slate-500">{new Date(a.submittedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
