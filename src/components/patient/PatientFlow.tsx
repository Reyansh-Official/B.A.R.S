"use client";

import { HeartHandshake } from "lucide-react";
import { useEffect, useState } from "react";
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
  accessToken?: string;
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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const { name, Component } = steps[step];
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-4 px-4 pb-8 pt-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white"><HeartHandshake className="h-5 w-5" aria-hidden /></span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-900">CareClear</p>
            <p className="text-xs text-slate-500">{policy.name}</p>
          </div>
        </div>
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
      <div key={step} className="flex animate-enter flex-col gap-4">
        <Component
          policy={policy}
          state={state}
          update={update}
          next={() => setStep((s) => Math.min(s + 1, steps.length - 1))}
          back={() => setStep((s) => Math.max(s - 1, 0))}
        />
      </div>
    </div>
  );
}
