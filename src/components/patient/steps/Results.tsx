import { Badge, Card, money } from "@/components/ui";
import { screen } from "@/lib/rules";
import type { StepProps } from "../PatientFlow";
import Nav from "./Nav";

const coverageLabel = {
  covered: { tone: "good", text: "Covered by this program" },
  separate_program: { tone: "info", text: "Separate assistance program" },
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
  ready: { tone: "good", text: "Ready for review" },
  missing_info: { tone: "warn", text: "A few things missing" },
  counselor_review: { tone: "info", text: "Needs a counselor" },
} as const;

export default function Results({ policy, state, next, back }: StepProps) {
  const r = screen(policy, state.bills, state.answers, state.docs, state.medicaidStatus);
  const byId = Object.fromEntries(state.bills.map((b) => [b.id, b]));

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Here&apos;s where you stand</h1>

      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">1. Which bills does this program cover?</h2>
        <ul className="flex flex-col gap-4">
          {r.coverage.map((c) => (
            <li key={c.billId}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{byId[c.billId]?.billerName}</p>
                <Badge tone={coverageLabel[c.status].tone}>{coverageLabel[c.status].text}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600">{c.reason}</p>
              {c.nextStep && (
                <p className="mt-2 rounded-lg bg-sky-50 p-2 text-sm text-sky-900">
                  Next step: {c.nextStep} Call <a className="font-semibold underline" href={`tel:${c.contactPhone}`}>{c.contactPhone}</a>.
                </p>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <div className="mb-2 flex items-start justify-between gap-3">
          <h2 className="font-semibold text-slate-900">2. Do you appear to qualify?</h2>
          <Badge tone={eligibilityLabel[r.eligibility.status].tone}>{eligibilityLabel[r.eligibility.status].text}</Badge>
        </div>
        <p className="text-sm text-slate-700">{r.eligibility.reason}</p>
        {state.bills.map((b) =>
          r.estimatedOwed[b.id] != null ? (
            <p key={b.id} className="mt-2 text-sm">
              {b.billerName}: <s className="text-slate-400">{money(b.amountOwed)}</s>{" "}
              <span className="font-bold text-emerald-700">about {money(r.estimatedOwed[b.id]!)}</span>
            </p>
          ) : null,
        )}
        <p className="mt-3 text-xs text-slate-500">This is a screening, not a decision. A counselor makes the final determination.</p>
      </Card>

      <Card>
        <div className="mb-2 flex items-start justify-between gap-3">
          <h2 className="font-semibold text-slate-900">3. Is your application ready?</h2>
          <Badge tone={readinessLabel[r.readiness.status].tone}>{readinessLabel[r.readiness.status].text}</Badge>
        </div>
        {r.readiness.missing.length > 0 && (
          <ul className="list-disc pl-5 text-sm text-slate-700">
            {r.readiness.missing.map((m) => <li key={m}>Still needed: {m}</li>)}
          </ul>
        )}
        {r.readiness.flags.map((f) => <p key={f} className="mt-1 text-sm text-slate-700">• {f}</p>)}
      </Card>

      <p className="text-xs text-slate-500">
        Based on the <a className="underline" href={policy.policy.url} target="_blank" rel="noreferrer">{policy.policy.title}</a>, revised {policy.policy.revision}.
      </p>
      <Nav next={next} back={back} nextLabel="Get my documents ready" />
    </>
  );
}
