import { useState, type ReactNode } from "react";
import type { Answers, Employment, Housing, MedicaidScreening } from "@/lib/types";
import type { FlowState, StepProps } from "../PatientFlow";
import Nav from "./Nav";

type Option<T> = { value: T; label: string; hint?: string };

function Choice<T extends string | boolean>({ options, value, onChange }: { options: Option<T>[]; value: T | undefined; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-2" role="radiogroup">
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-xl border-2 px-4 py-3 text-left ${value === o.value ? "border-teal-600 bg-teal-50" : "border-slate-200 bg-white"}`}
        >
          <span className="font-semibold">{o.label}</span>
          {o.hint && <span className="block text-sm text-slate-500">{o.hint}</span>}
        </button>
      ))}
    </div>
  );
}

const yesNo: Option<boolean>[] = [
  { value: true, label: "Yes" },
  { value: false, label: "No" },
];

// Plain-language names for the policy's presumptive programs a patient can self-report.
const programLabels: Record<string, string> = {
  snap: "SNAP (food stamps / EBT)",
  wic: "WIC",
  energy: "Maryland Energy Assistance (MEAP)",
  medicaid: "Medicaid (Maryland Medical Assistance)",
  medicaid_pharmacy: "Medicaid pharmacy coverage",
  slmb: "Medicare help from the state (SLMB)",
};

type MedicaidAnswer = "has_now" | "denied" | "waiting" | "no";

type QState = FlowState & { policyPresumptive: string[] };
interface Ctx {
  a: Answers;
  set: (patch: Partial<Answers>) => void;
  s: QState;
  update: StepProps["update"];
  answered: boolean;
}

interface Question {
  id: string;
  title: string;
  help?: string;
  show?: (s: FlowState) => boolean;
  valid?: (a: Answers) => boolean;
  render: (ctx: Ctx) => ReactNode;
}

function IncomeInput({ a, set }: { a: Answers; set: (patch: Partial<Answers>) => void }) {
  const [period, setPeriod] = useState<"year" | "month">("year");
  const [text, setText] = useState(a.annualIncome ? String(a.annualIncome) : "");
  const apply = (raw: string, p: "year" | "month") => {
    setText(raw);
    const n = Number(raw.replace(/[^0-9.]/g, "")) || 0;
    set({ annualIncome: Math.round(p === "month" ? n * 12 : n) });
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center rounded-xl border-2 border-slate-200 bg-white px-4 focus-within:border-teal-600">
        <span className="text-xl text-slate-500">$</span>
        <input
          inputMode="decimal"
          aria-label="Household income"
          className="w-full bg-transparent px-2 py-3 text-xl outline-none"
          value={text}
          onChange={(e) => apply(e.target.value, period)}
          placeholder="0"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(["year", "month"] as const).map((p) => (
          <button
            key={p}
            onClick={() => { setPeriod(p); apply(text, p); }}
            className={`rounded-lg border-2 py-2 font-semibold ${period === p ? "border-teal-600 bg-teal-50" : "border-slate-200 bg-white"}`}
          >
            per {p}
          </button>
        ))}
      </div>
      {period === "month" && a.annualIncome > 0 && (
        <p className="text-sm text-slate-500">That&apos;s about ${a.annualIncome.toLocaleString()} a year.</p>
      )}
    </div>
  );
}

const questions: Question[] = [
  {
    id: "household",
    title: "How many people are in your household?",
    help: "Count yourself, your spouse, your children, and anyone you claim on your taxes.",
    render: ({ a, set, answered }) => (
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-center gap-6">
          <button aria-label="Fewer" onClick={() => set({ householdSize: Math.max(1, a.householdSize - 1) })} className="h-14 w-14 rounded-full border-2 border-slate-300 bg-white text-2xl">−</button>
          <span className="w-16 text-center text-4xl font-bold" aria-live="polite">{a.householdSize}</span>
          <button aria-label="More" onClick={() => set({ householdSize: Math.min(20, a.householdSize + 1) })} className="h-14 w-14 rounded-full border-2 border-slate-300 bg-white text-2xl">+</button>
        </div>
        <div>
          <p className="mb-2 font-semibold">Are you married?</p>
          <Choice options={yesNo} value={answered ? a.married : undefined} onChange={(married) => set({ married, householdSize: married ? Math.max(2, a.householdSize) : a.householdSize })} />
        </div>
      </div>
    ),
  },
  {
    id: "income",
    title: "What is your household's total income before taxes?",
    help: "Include everyone in your household: wages, unemployment, Social Security, disability, child support, and any other money coming in.",
    render: ({ a, set }) => <IncomeInput a={a} set={set} />,
  },
  {
    id: "work",
    title: "What best describes your work situation?",
    render: ({ a, set, answered }) => (
      <div className="flex flex-col gap-5">
        <Choice<Employment>
          value={answered ? a.employment : undefined}
          onChange={(employment) => set({ employment })}
          options={[
            { value: "employed", label: "Working for an employer" },
            { value: "self_employed", label: "Self-employed", hint: "Gig work, own business, cash jobs" },
            { value: "unemployed", label: "Not working right now" },
            { value: "retired", label: "Retired" },
            { value: "disability", label: "Unable to work due to disability" },
          ]}
        />
        {!["retired", "disability"].includes(a.employment) && (
          <div>
            <p className="mb-2 font-semibold">Does anyone in your household get Social Security, disability, or pension income?</p>
            <Choice options={yesNo} value={answered ? a.hasBenefitIncome : undefined} onChange={(hasBenefitIncome) => set({ hasBenefitIncome })} />
          </div>
        )}
      </div>
    ),
  },
  {
    id: "insurance",
    title: "Do you have health insurance?",
    help: "Including Medicare or insurance through work. If your bill shows an insurance payment, choose yes.",
    render: ({ a, set, answered }) => <Choice options={yesNo} value={answered ? a.insured : undefined} onChange={(insured) => set({ insured })} />,
  },
  {
    id: "medicaid",
    title: "Have you applied for Medicaid?",
    help: "The hospital checks Medicaid first for patients without insurance. It may cover this bill.",
    show: (s) => !s.answers.insured,
    render: ({ a, s, update, answered }) => {
      const current: MedicaidAnswer | undefined = !answered ? undefined : a.benefits.includes("medicaid")
        ? "has_now"
        : s.medicaidStatus === "completed" ? "denied" : s.medicaidStatus === "pending" ? "waiting" : a.appliedForMedicaid === false ? "no" : undefined;
      const choose = (v: MedicaidAnswer) => {
        const benefits = a.benefits.filter((b) => b !== "medicaid");
        const medicaidStatus: MedicaidScreening = v === "denied" ? "completed" : v === "waiting" ? "pending" : v === "has_now" ? "completed" : "unknown";
        update({
          medicaidStatus,
          answers: { ...a, appliedForMedicaid: v === "denied" || v === "waiting", benefits: v === "has_now" ? [...benefits, "medicaid"] : benefits },
        });
      };
      return (
        <Choice<MedicaidAnswer>
          value={current}
          onChange={choose}
          options={[
            { value: "has_now", label: "Yes, and I have Medicaid now" },
            { value: "denied", label: "Yes, and I was denied" },
            { value: "waiting", label: "Yes, still waiting to hear" },
            { value: "no", label: "No" },
          ]}
        />
      );
    },
  },
  {
    id: "programs",
    title: "Does anyone in your household get any of these?",
    help: "If so, you may qualify for free care with less paperwork. Choose all that apply.",
    render: ({ a, set, s, answered }) => {
      const ids = s.policyPresumptive.filter((id) => id in programLabels && !(id === "medicaid" && !a.insured));
      const toggle = (id: string) =>
        set({ benefits: a.benefits.includes(id) ? a.benefits.filter((b) => b !== id) : [...a.benefits, id] });
      const none = answered && ids.every((id) => !a.benefits.includes(id));
      return (
        <div className="flex flex-col gap-2">
          {ids.map((id) => (
            <label key={id} className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 ${a.benefits.includes(id) ? "border-teal-600 bg-teal-50" : "border-slate-200 bg-white"}`}>
              <input type="checkbox" className="h-5 w-5 accent-teal-700" checked={a.benefits.includes(id)} onChange={() => toggle(id)} />
              <span className="font-semibold">{programLabels[id]}</span>
            </label>
          ))}
          <button
            onClick={() => set({ benefits: a.benefits.filter((b) => !ids.includes(b)) })}
            className={`rounded-xl border-2 px-4 py-3 text-left font-semibold ${none ? "border-teal-600 bg-teal-50" : "border-slate-200 bg-white"}`}
          >
            None of these
          </button>
        </div>
      );
    },
  },
  {
    id: "housing",
    title: "What is your housing situation?",
    render: ({ a, set, answered }) => (
      <Choice<Housing>
        value={answered ? a.housing : undefined}
        onChange={(housing) =>
          set({
            housing,
            benefits: housing === "homeless" ? [...new Set([...a.benefits, "homeless"])] : a.benefits.filter((b) => b !== "homeless"),
          })
        }
        options={[
          { value: "rent", label: "I rent" },
          { value: "own", label: "I own my home" },
          { value: "living_with_family", label: "I stay with family or friends", hint: "Free or for help around the house" },
          { value: "homeless", label: "I don't have stable housing" },
          { value: "other", label: "Something else" },
        ]}
      />
    ),
  },
  {
    id: "injury",
    title: "Was this visit because of a car accident, a work injury, or an injury someone else may be responsible for?",
    help: "Those claims are billed to the insurance or case first.",
    render: ({ a, set, answered }) => <Choice options={yesNo} value={answered ? a.thirdPartyInjury : undefined} onChange={(thirdPartyInjury) => set({ thirdPartyInjury })} />,
  },
];

export default function Questions({ state, update, next, back, policy }: StepProps) {
  const s: QState = { ...state, policyPresumptive: policy.presumptive_eligibility.qualifying.map((q) => q.id) };
  const visible = questions.filter((q) => !q.show || q.show(state));
  const [index, setIndex] = useState(0);
  const q = visible[Math.min(index, visible.length - 1)];
  const a = state.answers;
  const answered = Boolean(state.prefilled) || Boolean(state.answered?.includes(q.id));
  const touch = () => update({ answered: [...new Set([...(state.answered ?? []), q.id])] });
  const set = (patch: Partial<Answers>) => { touch(); update({ answers: { ...a, ...patch } }); };
  const updateAndTouch: StepProps["update"] = (patch) => { touch(); update(patch); };
  const last = index >= visible.length - 1;

  return (
    <>
      <p className="text-sm font-medium text-teal-700">Question {index + 1} of {visible.length}</p>
      <h1 className="text-2xl font-bold text-slate-900">{q.title}</h1>
      {q.help && <p className="text-slate-600">{q.help}</p>}
      <div key={q.id}>{q.render({ a, set, s, update: updateAndTouch, answered })}</div>
      <Nav
        next={() => (last ? next() : setIndex(index + 1))}
        back={() => (index === 0 ? back() : setIndex(index - 1))}
        nextLabel={last ? "See my results" : "Next"}
        nextDisabled={!answered || (q.valid ? !q.valid(a) : false)}
      />
    </>
  );
}
