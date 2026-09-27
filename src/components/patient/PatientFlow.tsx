"use client";

import { LogoMark } from "@/components/Logo";
import { useEffect, useState } from "react";
import type { DemoCase, Patient } from "@/lib/demo";
import { groupBills, type BillGroup, type BillResolution } from "@/lib/groups";
import type { Answers, Bill, DocState, MedicaidScreening, Policy } from "@/lib/types";
import Welcome from "./steps/Welcome";
import Upload from "./steps/Upload";
import Confirm from "./steps/Confirm";
import Questions from "./steps/Questions";
import Results from "./steps/Results";
import Documents from "./steps/Documents";
import Review from "./steps/Review";
import Submitted from "./steps/Submitted";
import AskChat from "./AskChat";

export interface FlowState {
  patient: Patient;
  bills: Bill[];
  answers: Answers;
  docs: Record<string, DocState>;
  medicaidStatus: MedicaidScreening;
  applicationId?: string;
  accessToken?: string;
  prefilled?: boolean;
  answered?: string[];
  resolutions?: Record<string, BillResolution>;
  extraPolicies?: Record<string, Policy>;
  applications?: SubmittedApplication[];
}

export interface SubmittedApplication {
  hospitalId: string;
  hospitalName: string;
  id: string;
  accessToken: string;
}

export interface StepProps {
  // Policy of the primary hospital (the one whose bills get the full screening).
  policy: Policy;
  primaryBills: Bill[];
  groups: BillGroup[];
  policies: Record<string, Policy>;
  homePolicyId: string;
  demoMode: boolean;
  state: FlowState;
  update: (patch: Partial<FlowState>) => void;
  next: () => void;
  back: () => void;
}

const steps = [
  { name: "Welcome", Component: Welcome },
  { name: "Upload bill", Component: Upload },
  { name: "Confirm details", Component: Confirm },
  { name: "Your household", Component: Questions },
  { name: "Results", Component: Results },
  { name: "Documents", Component: Documents },
  { name: "Review & send", Component: Review },
  { name: "Sent", Component: Submitted },
];

const emptyState: FlowState = {
  patient: { name: "", dob: "", address: "", phone: "" },
  bills: [],
  answers: {
    householdSize: 1,
    annualIncome: 0,
    employment: "employed",
    insured: false,
    married: false,
    benefits: [],
    hasBenefitIncome: false,
    housing: "rent",
    thirdPartyInjury: false,
    appliedForMedicaid: false,
  },
  docs: {},
  medicaidStatus: "unknown",
};

export default function PatientFlow({ policy, demoCases, demoMode }: { policy: Policy; demoCases: DemoCase[]; demoMode: boolean }) {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<FlowState>(emptyState);
  const update = (patch: Partial<FlowState>) => setState((s) => ({ ...s, ...patch }));

  const loadDemo = (id: string) => {
    const c = demoCases.find((d) => d.id === id);
    if (!c) return setState(emptyState);
    setState({ patient: c.patient, bills: c.bills.map((b) => ({ ...b, patientName: b.patientName ?? c.patient.name })), answers: c.answers, docs: c.docs, medicaidStatus: c.medicaidStatus, prefilled: true });
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const policies: Record<string, Policy> = { ...state.extraPolicies, [policy.id]: policy };
  const groups = groupBills(state.bills, state.resolutions ?? {}, { id: policy.id, name: policy.name });
  const primaryGroup = groups.find((g) => g.status === "live" && g.hospitalId && policies[g.hospitalId]);
  const primaryPolicy = (primaryGroup?.hospitalId && policies[primaryGroup.hospitalId]) || policy;
  const primaryBills = primaryGroup?.bills ?? [];

  const { name, Component } = steps[step];
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-4 px-4 pb-24 pt-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LogoMark size={40} />
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-wide text-slate-900">B.A.R.S.</p>
            <p className="text-xs text-slate-500">{primaryPolicy.name}</p>
          </div>
        </div>
        {demoMode && (
        <select
          aria-label="Load demo patient"
          className="max-w-32 rounded-full border border-dashed border-slate-300 bg-transparent px-2 py-1 text-xs text-slate-500"
          onChange={(e) => loadDemo(e.target.value)}
          defaultValue=""
        >
          <option value="">Demo…</option>
          {demoCases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.patient.name.split(" ")[0]}: {c.title}
            </option>
          ))}
        </select>
        )}
      </header>
      {step > 0 && (
        <div>
          <div className="flex gap-1" aria-hidden>
            {steps.slice(1).map((s, i) => (
              <div key={s.name} className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? "bg-teal-600" : "bg-slate-200"}`} />
            ))}
          </div>
          <p className="mt-2 text-xs font-medium text-slate-500">
            Step {step} of {steps.length - 1} · {name}
          </p>
        </div>
      )}
      {step >= 1 && (
        <AskChat
          hospitalId={primaryPolicy.id}
          hospitalName={primaryPolicy.name}
          phone={primaryPolicy.contact.phone}
          context={
            // Only what helps answer: which bills, which program, household size, and insurance. No names or IDs.
            [
              state.bills.length ? `Bills: ${state.bills.map((b) => `${b.billerName} $${b.amountOwed.toLocaleString()} (${state.resolutions?.[b.id]?.kind === "separate_program" ? "separate program" : "hospital policy"})`).join("; ")}.` : "No bills uploaded yet.",
              state.answered?.length || state.prefilled ? `Household of ${state.answers.householdSize}; ${state.answers.insured ? "has" : "no"} health insurance.` : "",
            ].join(" ")
          }
        />
      )}
      <div key={step} className="flex animate-enter flex-col gap-4">
        <Component
          policy={primaryPolicy}
          primaryBills={primaryBills}
          groups={groups}
          policies={policies}
          homePolicyId={policy.id}
          demoMode={demoMode}
          state={state}
          update={update}
          next={() => setStep((s) => Math.min(s + 1, steps.length - 1))}
          back={() => setStep((s) => Math.max(s - 1, 0))}
        />
      </div>
    </div>
  );
}
