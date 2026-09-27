import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import ApplicationPreview from "@/components/ApplicationPreview";
import AutoRefresh from "@/components/AutoRefresh";
import CounselorActions from "@/components/counselor/CounselorActions";
import Thread from "@/components/Thread";
import { Badge, Card, money } from "@/components/ui";
import { counselorStatus } from "@/lib/status";
import { getPolicy } from "@/lib/policies";
import { getApplication } from "@/lib/store";

export default async function ApplicationPacket({ params }: PageProps<"/counselor/[id]">) {
  await connection();
  const { id } = await params;
  const app = getApplication(id);
  if (!app) notFound();
  const { screening: s } = app;
  const signatures = s.readiness.documents.filter((d) => d.id.includes("signature"));
  const requestable = s.readiness.documents
    .filter((d) => d.status === "missing" || d.status === "counselor")
    .map((d) => ({ id: d.id, label: d.label, note: d.statusNote }));
  const status = counselorStatus[app.status];

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-4 px-6 py-8 md:grid-cols-2">
      <div className="md:col-span-2">
        <Link href="/counselor" className="text-sm text-teal-700 underline">← Queue</Link>
        <AutoRefresh />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{app.patient.name}</h1>
          <Badge tone={status.tone}>{status.text}</Badge>
        </div>
        <p className="text-sm text-slate-500">
          Ref {app.id} · Screened under {s.policyId.toUpperCase()} policy rev. {s.policyRevision}
        </p>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">Actions</h2>
        <CounselorActions
          key={`${app.status}-${app.updatedAt}`}
          appId={app.id}
          firstName={app.patient.name.split(" ")[0]}
          status={app.status}
          insured={app.answers.insured}
          medicaidStatus={app.medicaidStatus}
          requestable={requestable}
        />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Conversation</h2>
        {app.messages.length ? <Thread messages={app.messages} viewer="counselor" /> : <p className="text-sm text-slate-500">No messages yet.</p>}
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Bills</h2>
        {s.coverage.map((c) => {
          const bill = app.bills.find((b) => b.id === c.billId)!;
          return (
            <div key={c.billId} className="mb-3">
              <p className="font-medium">{bill.billerName} · {money(bill.amountOwed)}</p>
              <p className="text-sm text-slate-600">{c.status.replaceAll("_", " ")}: {c.reason}</p>
            </div>
          );
        })}
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Screening</h2>
        <Badge tone="good">{s.eligibility.status.replaceAll("_", " ")} · {s.eligibility.discountPct}%</Badge>
        <p className="mt-2 text-sm text-slate-700">{s.eligibility.reason}</p>
        <p className="mt-1 text-xs text-slate-500">Rule: {s.eligibility.source}</p>
        <p className="mt-3 text-sm">Medicaid screening: <b>{s.medicaidScreening.replaceAll("_", " ")}</b></p>
        {s.medicaid && s.medicaid.status !== "not_applicable" && (
          <div className={`mt-3 rounded-lg p-3 text-sm ${s.medicaid.status === "unlikely" ? "bg-slate-50 text-slate-700" : "bg-violet-50 text-violet-950"}`}>
            <p className="font-semibold">
              Medicaid pre-screen: {s.medicaid.status === "likely" ? "likely eligible" : s.medicaid.status === "possible" ? "possibly eligible" : "unlikely"}
              {s.medicaid.groupLabel && <span className="font-normal"> · {s.medicaid.groupLabel}, {s.medicaid.pctFpl}% FPL</span>}
            </p>
            <p className="mt-1">{s.medicaid.reason}</p>
            {s.medicaid.applyBy && s.medicaid.status !== "unlikely" && (
              <p className="mt-1 font-medium">Retroactive coverage reaches this visit if they apply by {s.medicaid.applyBy}. Help them apply first; financial assistance remains the backup.</p>
            )}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Documents</h2>
        <ul className="text-sm">
          {s.readiness.documents.filter((d) => !d.id.includes("signature")).map((d) => (
            <li key={d.id} className="py-1">
              <b>{d.status}</b> · {d.label}
              {d.statusNote && <span className="block text-slate-600">{d.statusNote}</span>}
              {d.files?.map((f, i) => {
                const check = d.checks?.find((c) => c.fileName === f.name);
                return (
                  <div key={i}>
                    <a href={f.dataUrl} download={f.name} className="block text-teal-700 underline">📎 {f.name}</a>
                    {check && (
                      <p className={`ml-5 text-xs ${check.verdict === "ok" ? "text-emerald-800" : "text-amber-800"}`}>
                        AI pre-check ({check.verdict === "ok" ? "matches" : "review"}): {check.summary}. {check.verdict !== "ok" && check.details.join(" ")}
                      </p>
                    )}
                  </div>
                );
              })}
            </li>
          ))}
        </ul>
        {s.readiness.flags.map((f) => <p key={f} className="mt-2 text-sm text-amber-800">⚑ {f}</p>)}
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Signatures</h2>
        {signatures.map((d) => (
          <div key={d.id} className="mb-3">
            <p className="text-sm">{d.label}: {d.status === "provided" ? d.statusNote : <span className="text-amber-700">Missing</span>}</p>
            {d.files?.[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.files[0].dataUrl} alt={d.label} className="mt-1 h-20 rounded border border-slate-200 bg-white" />
            )}
          </div>
        ))}
      </Card>

      <Card className="md:col-span-2">
        <ApplicationPreview
          policyName={getPolicy(app.hospitalId)?.name ?? app.hospitalId}
          patient={app.patient}
          answers={app.answers}
          bills={app.bills}
          screening={s}
          medicaidStatus={app.medicaidStatus}
        />
      </Card>
    </main>
  );
}
