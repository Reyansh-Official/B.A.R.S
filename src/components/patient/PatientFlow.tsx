"use client";

import { useState } from "react";
import type { DemoCase, Patient } from "@/lib/demo";
import type { Answers, Bill, DocState, MedicaidScreening, Policy } from "@/lib/types";
import Welcome from "./steps/Welcome";
import Upload from "./steps/Upload";
import Confirm from "./steps/Confirm";
import Questions from "./steps/Questions";
import Results from "./steps/Results";
import Documents from "./steps/Documents";
import Review from "./steps/Review";
import Submitted from "./steps/Submitted";

export interface FlowState {
  patient: Patient;
  bills: Bill[];
  answers: Answers;
  docs: Record<string, DocState>;
  medicaidStatus: MedicaidScreening;
  applicationId?: string;
  prefilled?: boolean;
  answered?: string[];
}

export interface StepProps {
  policy: Policy;
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

export default function PatientFlow({ policy, demoCases }: { policy: Policy; demoCases: DemoCase[] }) {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<FlowState>(emptyState);
  const update = (patch: Partial<FlowState>) => setState((s) => ({ ...s, ...patch }));

  const loadDemo = (id: string) => {
    const c = demoCases.find((d) => d.id === id);
    if (!c) return setState(emptyState);
    setState({ patient: c.patient, bills: c.bills, answers: c.answers, docs: c.docs, medicaidStatus: c.medicaidStatus, prefilled: true });
  };

  const { name, Component } = steps[step];
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-teal-700">CareClear</p>
          <p className="text-xs text-slate-500">{policy.name}</p>
        </div>
        <select
          aria-label="Load demo patient"
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
          onChange={(e) => loadDemo(e.target.value)}
          defaultValue=""
        >
          <option value="">Demo patient…</option>
          {demoCases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.patient.name.split(" ")[0]}: {c.title}
            </option>
          ))}
        </select>
      </header>
      <div className="h-1.5 rounded-full bg-slate-200">
        <div className="h-1.5 rounded-full bg-teal-600 transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
      </div>
      <p className="text-xs uppercase tracking-wide text-slate-500">
        Step {step + 1} of {steps.length} · {name}
      </p>
      <Component
        policy={policy}
        state={state}
        update={update}
        next={() => setStep((s) => Math.min(s + 1, steps.length - 1))}
        back={() => setStep((s) => Math.max(s - 1, 0))}
      />
    </div>
  );
}
