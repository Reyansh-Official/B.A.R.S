import { AlertTriangle, CheckCircle2, ChevronDown, ExternalLink, Info, Phone, ShieldPlus } from "lucide-react";
import type { ReactNode } from "react";
import { money } from "@/components/ui";
import { ageFromDob, medicaidProgram } from "@/lib/programs";
import { screen } from "@/lib/rules";
import type { Bill, Screening } from "@/lib/types";
import type { StepProps } from "../PatientFlow";
import Nav from "./Nav";

type Tone = "good" | "warn" | "info";

const tones: Record<Tone, { icon: typeof CheckCircle2; ring: string; iconCls: string; badge: string }> = {
  good: { icon: CheckCircle2, ring: "border-l-emerald-500", iconCls: "text-emerald-600", badge: "bg-emerald-100 text-emerald-800" },
  warn: { icon: AlertTriangle, ring: "border-l-amber-500", iconCls: "text-amber-600", badge: "bg-amber-100 text-amber-900" },
  info: { icon: Info, ring: "border-l-sky-500", iconCls: "text-sky-600", badge: "bg-sky-100 text-sky-900" },
};

const coverageLabel = {
  covered: { tone: "good", text: "Covered" },
  separate_program: { tone: "info", text: "Separate program" },
  counselor_review: { tone: "warn", text: "Counselor will check" },
} as const;

const eligibilityLabel = {
  presumptive: { tone: "good", text: "Likely free care" },
  potentially_eligible: { tone: "good", text: "Potentially eligible" },
  hardship_review: { tone: "info", text: "Hardship review" },
  not_eligible_by_income: { tone: "warn", text: "Above income limits" },
  counselor_review: { tone: "info", text: "Counselor review" },
} as const;

const readinessLabel = {
  ready: { tone: "good", text: "Ready" },
  missing_info: { tone: "warn", text: "A few things missing" },
  counselor_review: { tone: "info", text: "Counselor will help" },
} as const;

function StatusCard({ n, question, tone, badge, children, why }: { n: number; question: string; tone: Tone; badge: string; children: ReactNode; why?: ReactNode }) {
  const t = tones[tone];
  return (
    <section className={`rounded-2xl border border-l-4 border-slate-200 bg-white p-5 ${t.ring}`}>
      <div className="flex items-start gap-3">
        <t.icon className={`mt-0.5 h-5 w-5 shrink-0 ${t.iconCls}`} aria-hidden />
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Question {n}</p>
          <h2 className="font-semibold text-slate-900">{question}</h2>
          <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-sm font-semibold ${t.badge}`}>{badge}</span>
          <div className="mt-3 text-sm text-slate-700">{children}</div>
          {why && (
            <details className="group mt-3 text-sm">
              <summary className="flex cursor-pointer list-none items-center gap-1 font-medium text-teal-700">
                Why? <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="mt-2 rounded-lg bg-slate-50 p-3 text-slate-600">{why}</div>
            </details>
          )}
        </div>
      </div>
    </section>
  );
}

const fmtDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

function MedicaidCard({ m, bills }: { m: NonNullable<Screening["medicaid"]>; bills: Bill[] }) {
  const p = medicaidProgram;
  const covered = bills.filter((b) => m.coveredBills.some((c) => c.billId === b.id));
  return (
    <section className="rounded-3xl border-2 border-violet-300 bg-violet-50 p-5">
      <div className="flex items-start gap-3">
        <ShieldPlus className="mt-0.5 h-6 w-6 shrink-0 text-violet-700" aria-hidden />
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">{m.status === "likely" ? "Even better" : "Worth checking"}</p>
          <h2 className="text-xl font-bold text-slate-900">You {m.status === "likely" ? "may qualify" : "might still qualify"} for Maryland Medicaid</h2>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-700">{m.reason}</p>
      <ul className="mt-4 flex flex-col gap-2 text-sm text-slate-800">
        {covered.length > 0 && (
          <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-violet-700" aria-hidden />
            It can pay bills from up to {p.retroactive.months_before_application_month} months before you apply, including this visit.
          </li>
        )}
        <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-violet-700" aria-hidden />It covers doctors&apos; bills too, not just the hospital.</li>
        <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-violet-700" aria-hidden />It&apos;s health coverage going forward, so future visits are covered.</li>
      </ul>
      {m.applyBy && (
        <p className="mt-4 rounded-xl bg-white p-3 text-sm font-semibold text-violet-900">
          Apply by {fmtDate(m.applyBy)} so Medicaid can cover your {fmtDate(covered[0]?.serviceDate ?? m.applyBy)} visit.
        </p>
      )}
      {m.childrenMayQualify && (
        <p className="mt-3 text-sm text-slate-700">Your children under 19 may also qualify for free or low-cost coverage through MCHP.</p>
      )}
      <div className="mt-4 flex flex-col gap-2">
        <a href={p.apply.url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 font-semibold text-white">
          Apply at Maryland Health Connection <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
        <a href={`tel:${p.apply.phone}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-300 bg-white px-4 py-3 font-semibold text-violet-900">
          <Phone className="h-4 w-4" aria-hidden /> Call {p.apply.phone}
        </a>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        {p.apply.hours}. Your counselor can help you apply. This doesn&apos;t check citizenship or immigration status or work rules; the state decides.
        Financial assistance below still applies either way.
      </p>
    </section>
  );
}

export default function Results({ policy, state, next, back }: StepProps) {
  const r = screen(policy, state.bills, state.answers, state.docs, state.medicaidStatus, { medicaid: medicaidProgram, patientAge: ageFromDob(state.patient.dob) });
  const byId = Object.fromEntries(state.bills.map((b) => [b.id, b]));
  const estimated = state.bills.filter((b) => r.estimatedOwed[b.id] != null);
  const before = estimated.reduce((s, b) => s + b.amountOwed, 0);
  const after = estimated.reduce((s, b) => s + (r.estimatedOwed[b.id] ?? 0), 0);
  const separate = r.coverage.filter((c) => c.status === "separate_program");
  const stillNeeded = r.readiness.missing.filter((m) => !m.toLowerCase().includes("signature"));
  const source = (
    <>
      From the <a className="underline" href={policy.policy.url} target="_blank" rel="noreferrer">{policy.policy.title}</a> (revised {policy.policy.revision})
    </>
  );

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Here&apos;s where you stand</h1>

      {estimated.length > 0 ? (
        <div className="rounded-3xl bg-gradient-to-br from-teal-700 to-teal-900 p-6 text-white">
          <p className="text-sm text-teal-100">You may owe about</p>
          <p className="mt-1 text-5xl font-bold tabular-nums">{money(after)}</p>
          <p className="mt-1 text-teal-100">instead of <s>{money(before)}</s></p>
          <div className="mt-5 flex flex-col gap-2" aria-hidden>
            <div className="h-3 w-full rounded-full bg-white/25" />
            <div className="h-3 rounded-full bg-white" style={{ width: `${Math.max(2, (after / before) * 100)}%` }} />
          </div>
          <p className="mt-4 text-xs text-teal-100">An estimate from the hospital&apos;s published rules. A financial counselor makes the final decision.</p>
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="font-semibold text-slate-900">A counselor will look at your situation</p>
          <p className="mt-1 text-sm text-slate-600">{r.eligibility.reason}</p>
        </div>
      )}

      {r.medicaid && (r.medicaid.status === "likely" || r.medicaid.status === "possible") && <MedicaidCard m={r.medicaid} bills={state.bills} />}

      {separate.map((c) => (
        <div key={c.billId} className="flex gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
          <Phone className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" aria-hidden />
          <div>
            <p className="font-semibold">Your {money(byId[c.billId]?.amountOwed ?? 0)} bill from {c.matchedName} needs a separate step</p>
            <p className="mt-1">Doctors bill separately from the hospital and have their own assistance program. Call <a className="font-semibold underline" href={`tel:${c.contactPhone}`}>{c.contactPhone}</a> and ask about financial assistance.</p>
          </div>
        </div>
      ))}

      <StatusCard
        n={1}
        question="Which bills does this program cover?"
        tone={r.coverage.every((c) => c.status === "covered") ? "good" : "info"}
        badge={`${r.coverage.filter((c) => c.status === "covered").length} of ${r.coverage.length} covered`}
        why={<ul className="flex flex-col gap-2">{r.coverage.map((c) => <li key={c.billId}>{c.reason}</li>)}</ul>}
      >
        <ul className="flex flex-col gap-2">
          {r.coverage.map((c) => (
            <li key={c.billId} className="flex items-center justify-between gap-3">
              <span>{byId[c.billId]?.billerName} · {money(byId[c.billId]?.amountOwed ?? 0)}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${tones[coverageLabel[c.status].tone].badge}`}>{coverageLabel[c.status].text}</span>
            </li>
          ))}
        </ul>
      </StatusCard>

      <StatusCard
        n={2}
        question="Does your household appear to qualify?"
        tone={eligibilityLabel[r.eligibility.status].tone}
        badge={r.eligibility.discountPct === 100 ? "Free care" : r.eligibility.discountPct > 0 ? `${r.eligibility.discountPct}% discount` : eligibilityLabel[r.eligibility.status].text}
        why={<><p>{r.eligibility.reason}</p><p className="mt-2 text-xs">{source}, {r.eligibility.source}.</p></>}
      >
        {r.eligibility.status === "presumptive"
          ? "Because you receive a qualifying public benefit, you may not need to prove your income."
          : r.eligibility.status === "potentially_eligible"
            ? `Based on a household of ${state.answers.householdSize} with $${state.answers.annualIncome.toLocaleString()} a year.`
            : r.eligibility.reason}
      </StatusCard>

      <StatusCard
        n={3}
        question="Is your application ready?"
        tone={stillNeeded.length ? "warn" : readinessLabel[r.readiness.status].tone}
        badge={stillNeeded.length ? `${stillNeeded.length} thing${stillNeeded.length > 1 ? "s" : ""} to add` : readinessLabel[r.readiness.status].text}
        why={r.readiness.flags.length ? <ul className="flex flex-col gap-1">{r.readiness.flags.map((f) => <li key={f}>{f}</li>)}</ul> : undefined}
      >
        {stillNeeded.length ? (
          <ul className="flex flex-col gap-1">{stillNeeded.map((m) => <li key={m}>• {m}</li>)}</ul>
        ) : (
          <p>No documents missing.</p>
        )}
        <p className="mt-2 text-slate-500">Don&apos;t have something? The next screen shows what else is accepted. You&apos;ll sign at the end.</p>
      </StatusCard>

      <Nav next={next} back={back} nextLabel="Get my documents ready" />
    </>
  );
}
