import type { ReactNode } from "react";
import type { Patient } from "@/lib/demo";
import type { Answers, Bill, MedicaidScreening, Screening } from "@/lib/types";
import { money } from "./ui";

const employment = {
  employed: "Employed",
  self_employed: "Self-employed",
  unemployed: "Not currently working",
  retired: "Retired",
  disability: "Unable to work (disability)",
};
const housing = {
  rent: "Rents",
  own: "Owns home",
  living_with_family: "Staying with family or friends",
  homeless: "No stable housing",
  other: "Other",
};
const medicaid = {
  not_required: "Insured; not required",
  unknown: "Not applied",
  pending: "Applied; waiting for decision",
  completed: "Screened",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-slate-200 pt-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">{children}</dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  const empty = value === "" || value == null;
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd className={empty ? "text-amber-700" : "text-slate-900"}>{empty ? "Missing" : value}</dd>
    </>
  );
}

// Mirrors the sections of the hospital's paper application so counselors can review it the way they already do.
export default function ApplicationPreview({
  policyName,
  patient,
  answers,
  bills,
  screening,
  medicaidStatus,
}: {
  policyName: string;
  patient: Patient;
  answers: Answers;
  bills: Bill[];
  screening: Screening;
  medicaidStatus: MedicaidScreening;
}) {
  const coverage = Object.fromEntries(screening.coverage.map((c) => [c.billId, c]));
  return (
    <div className="flex flex-col gap-3">
      <p className="font-semibold">{policyName}: Financial Assistance Application</p>

      <Section title="Patient">
        <Row label="Name" value={patient.name} />
        <Row label="Date of birth" value={patient.dob} />
        <Row label="Address" value={patient.address} />
        <Row label="Phone" value={patient.phone} />
        <Row label="Married" value={answers.married ? "Yes" : "No"} />
        <Row label="SSN" value={<span className="text-slate-500">Collected by the counselor, not online</span>} />
      </Section>

      <Section title="Household and income">
        <Row label="Household size" value={answers.householdSize} />
        <Row label="Monthly gross income" value={money(answers.annualIncome / 12)} />
        <Row label="Yearly income" value={money(answers.annualIncome)} />
        <Row label="Work" value={employment[answers.employment]} />
        <Row label="Benefit income" value={answers.hasBenefitIncome ? "Yes" : "No"} />
        <Row label="Housing" value={housing[answers.housing]} />
        <Row label="Public programs" value={answers.benefits.length ? answers.benefits.join(", ").toUpperCase() : "None"} />
      </Section>

      <Section title="Insurance and Medicaid">
        <Row label="Health insurance" value={answers.insured ? "Yes" : "No"} />
        <Row label="Medicaid" value={medicaid[medicaidStatus]} />
      </Section>

      <Section title="Accident or legal claim">
        <Row label="Third-party claim" value={answers.thirdPartyInjury ? "Yes" : "No"} />
      </Section>

      <Section title="Bills included">
        {bills.map((b) => (
          <Row
            key={b.id}
            label={money(b.amountOwed)}
            value={
              <>
                {b.billerName} · {b.serviceDate}
                {coverage[b.id]?.status !== "covered" && (
                  <span className="block text-xs text-sky-800">Not covered by this policy: {coverage[b.id]?.nextStep ?? "counselor review"}</span>
                )}
              </>
            }
          />
        ))}
      </Section>

      <Section title="Supporting documents">
        {screening.readiness.documents
          .filter((d) => !d.id.includes("signature"))
          .map((d) => (
            <Row
              key={d.id}
              label={d.label}
              value={
                d.status === "missing"
                  ? d.statusNote && <span className="text-amber-700">Missing: {d.statusNote}</span>
                  : d.statusNote ?? (d.files?.length ? `${d.files.length} file(s)` : "Provided")
              }
            />
          ))}
      </Section>
    </div>
  );
}
