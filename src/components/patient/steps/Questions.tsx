import { useState, type ReactNode } from "react";
import type { Answers, Employment, Housing, MedicaidScreening } from "@/lib/types";
import { useLang } from "@/lib/i18n";
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

type Tr = (en: string, es: string) => string;
const yesNo = (tr: Tr): Option<boolean>[] => [
  { value: true, label: tr("Yes", "Sí") },
  { value: false, label: "No" },
];

// Plain-language names for the policy's presumptive programs a patient can self-report.
const programLabels: Record<string, [string, string]> = {
  snap: ["SNAP (food stamps / EBT)", "SNAP (cupones de alimentos / EBT)"],
  wic: ["WIC", "WIC"],
  energy: ["Maryland Energy Assistance (MEAP)", "Asistencia de Energía de Maryland (MEAP)"],
  medicaid: ["Medicaid (Maryland Medical Assistance)", "Medicaid (Asistencia Médica de Maryland)"],
  medicaid_pharmacy: ["Medicaid pharmacy coverage", "Cobertura de farmacia de Medicaid"],
  slmb: ["Medicare help from the state (SLMB)", "Ayuda estatal con Medicare (SLMB)"],
};

type MedicaidAnswer = "has_now" | "denied" | "waiting" | "no";

type QState = FlowState & { policyPresumptive: string[] };
interface Ctx {
  a: Answers;
  set: (patch: Partial<Answers>) => void;
  s: QState;
  update: StepProps["update"];
  answered: boolean;
  tr: Tr;
}

interface Question {
  id: string;
  title: [string, string];
  help?: [string, string];
  show?: (s: FlowState) => boolean;
  valid?: (a: Answers) => boolean;
  render: (ctx: Ctx) => ReactNode;
}

function IncomeInput({ a, set, tr }: { a: Answers; set: (patch: Partial<Answers>) => void; tr: Tr }) {
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
          aria-label={tr("Household income", "Ingresos del hogar")}
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
            {p === "year" ? tr("per year", "por año") : tr("per month", "por mes")}
          </button>
        ))}
      </div>
      {period === "month" && a.annualIncome > 0 && (
        <p className="text-sm text-slate-500">{tr(`That's about $${a.annualIncome.toLocaleString()} a year.`, `Son unos $${a.annualIncome.toLocaleString()} al año.`)}</p>
      )}
    </div>
  );
}

const questions: Question[] = [
  {
    id: "household",
    title: ["How many people are in your household?", "¿Cuántas personas hay en su hogar?"],
    help: ["Count yourself, your spouse, your children, and anyone you claim on your taxes.", "Cuéntese a usted, a su cónyuge, a sus hijos y a cualquier persona que declare en sus impuestos."],
    render: ({ a, set, answered, tr }) => (
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-center gap-6">
          <button aria-label={tr("Fewer", "Menos")} onClick={() => set({ householdSize: Math.max(1, a.householdSize - 1) })} className="h-14 w-14 rounded-full border-2 border-slate-300 bg-white text-2xl">−</button>
          <span className="w-16 text-center text-4xl font-bold" aria-live="polite">{a.householdSize}</span>
          <button aria-label={tr("More", "Más")} onClick={() => set({ householdSize: Math.min(20, a.householdSize + 1) })} className="h-14 w-14 rounded-full border-2 border-slate-300 bg-white text-2xl">+</button>
        </div>
        <div>
          <p className="mb-2 font-semibold">{tr("Are you married?", "¿Está casado(a)?")}</p>
          <Choice options={yesNo(tr)} value={answered ? a.married : undefined} onChange={(married) => set({ married, householdSize: married ? Math.max(2, a.householdSize) : a.householdSize })} />
        </div>
      </div>
    ),
  },
  {
    id: "income",
    title: ["What is your household's total income before taxes?", "¿Cuál es el ingreso total de su hogar antes de impuestos?"],
    help: [
      "Include everyone in your household: wages, unemployment, Social Security, disability, child support, and any other money coming in.",
      "Incluya a todos en su hogar: salarios, desempleo, Seguro Social, discapacidad, manutención de hijos y cualquier otro dinero que reciban.",
    ],
    render: ({ a, set, tr }) => <IncomeInput a={a} set={set} tr={tr} />,
  },
  {
    id: "work",
    title: ["What best describes your work situation?", "¿Qué describe mejor su situación de trabajo?"],
    render: ({ a, set, answered, tr }) => (
      <div className="flex flex-col gap-5">
        <Choice<Employment>
          value={answered ? a.employment : undefined}
          onChange={(employment) => set({ employment })}
          options={[
            { value: "employed", label: tr("Working for an employer", "Trabajo para un empleador") },
            { value: "self_employed", label: tr("Self-employed", "Trabajo por cuenta propia"), hint: tr("Gig work, own business, cash jobs", "Trabajos por aplicación, negocio propio, trabajos en efectivo") },
            { value: "unemployed", label: tr("Not working right now", "No estoy trabajando ahora") },
            { value: "retired", label: tr("Retired", "Jubilado(a)") },
            { value: "disability", label: tr("Unable to work due to disability", "No puedo trabajar por una discapacidad") },
          ]}
        />
        {!["retired", "disability"].includes(a.employment) && (
          <div>
            <p className="mb-2 font-semibold">{tr("Does anyone in your household get Social Security, disability, or pension income?", "¿Alguien en su hogar recibe ingresos del Seguro Social, por discapacidad o de una pensión?")}</p>
            <Choice options={yesNo(tr)} value={answered ? a.hasBenefitIncome : undefined} onChange={(hasBenefitIncome) => set({ hasBenefitIncome })} />
          </div>
        )}
      </div>
    ),
  },
  {
    id: "insurance",
    title: ["Do you have health insurance?", "¿Tiene seguro médico?"],
    help: [
      "Including Medicare or insurance through work. If your bill shows an insurance payment, choose yes.",
      "Incluye Medicare o seguro por su trabajo. Si su factura muestra un pago del seguro, elija sí.",
    ],
    render: ({ a, set, answered, tr }) => <Choice options={yesNo(tr)} value={answered ? a.insured : undefined} onChange={(insured) => set({ insured })} />,
  },
  {
    id: "about",
    title: ["Do any of these apply?", "¿Aplica alguno de estos casos?"],
    help: ["Some programs have higher income limits for these. Choose all that apply.", "Algunos programas tienen límites de ingresos más altos en estos casos. Elija todos los que apliquen."],
    show: (s) => !s.answers.insured,
    render: ({ a, set, answered, tr }) => {
      const opts = [
        { key: "pregnant", label: tr("I'm pregnant", "Estoy embarazada") },
        { key: "childrenUnder19", label: tr("There are children under 19 in my household", "Hay niños menores de 19 años en mi hogar") },
        { key: "over65", label: tr("I'm 65 or older", "Tengo 65 años o más") },
      ] as const;
      const none = answered && opts.every((o) => !a[o.key]);
      return (
        <div className="flex flex-col gap-2">
          {opts.map((o) => (
            <label key={o.key} className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 ${a[o.key] ? "border-teal-600 bg-teal-50" : "border-slate-200 bg-white"}`}>
              <input type="checkbox" className="h-5 w-5 accent-teal-700" checked={Boolean(a[o.key])} onChange={() => set({ [o.key]: !a[o.key] })} />
              <span className="font-semibold">{o.label}</span>
            </label>
          ))}
          <button
            onClick={() => set({ pregnant: false, childrenUnder19: false, over65: false })}
            className={`rounded-xl border-2 px-4 py-3 text-left font-semibold ${none ? "border-teal-600 bg-teal-50" : "border-slate-200 bg-white"}`}
          >
            {tr("None of these", "Ninguno de estos")}
          </button>
        </div>
      );
    },
  },
  {
    id: "medicaid",
    title: ["Have you applied for Medicaid?", "¿Ha solicitado Medicaid?"],
    help: [
      "The hospital checks Medicaid first for patients without insurance. It may cover this bill.",
      "El hospital revisa Medicaid primero para pacientes sin seguro. Podría cubrir esta factura.",
    ],
    show: (s) => !s.answers.insured,
    render: ({ a, s, update, answered, tr }) => {
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
            { value: "has_now", label: tr("Yes, and I have Medicaid now", "Sí, y ya tengo Medicaid") },
            { value: "denied", label: tr("Yes, and I was denied", "Sí, y me lo negaron") },
            { value: "waiting", label: tr("Yes, still waiting to hear", "Sí, todavía espero respuesta") },
            { value: "no", label: "No" },
          ]}
        />
      );
    },
  },
  {
    id: "programs",
    title: ["Does anyone in your household get any of these?", "¿Alguien en su hogar recibe alguno de estos?"],
    help: [
      "If so, you may qualify for free care with less paperwork. Choose all that apply.",
      "Si es así, podría calificar para atención gratuita con menos papeleo. Elija todos los que apliquen.",
    ],
    render: ({ a, set, s, answered, tr }) => {
      const ids = s.policyPresumptive.filter((id) => id in programLabels && !(id === "medicaid" && !a.insured));
      const toggle = (id: string) =>
        set({ benefits: a.benefits.includes(id) ? a.benefits.filter((b) => b !== id) : [...a.benefits, id] });
      const none = answered && ids.every((id) => !a.benefits.includes(id));
      return (
        <div className="flex flex-col gap-2">
          {ids.map((id) => (
            <label key={id} className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 ${a.benefits.includes(id) ? "border-teal-600 bg-teal-50" : "border-slate-200 bg-white"}`}>
              <input type="checkbox" className="h-5 w-5 accent-teal-700" checked={a.benefits.includes(id)} onChange={() => toggle(id)} />
              <span className="font-semibold">{tr(...programLabels[id])}</span>
            </label>
          ))}
          <button
            onClick={() => set({ benefits: a.benefits.filter((b) => !ids.includes(b)) })}
            className={`rounded-xl border-2 px-4 py-3 text-left font-semibold ${none ? "border-teal-600 bg-teal-50" : "border-slate-200 bg-white"}`}
          >
            {tr("None of these", "Ninguno de estos")}
          </button>
        </div>
      );
    },
  },
  {
    id: "housing",
    title: ["What is your housing situation?", "¿Cuál es su situación de vivienda?"],
    render: ({ a, set, answered, tr }) => (
      <Choice<Housing>
        value={answered ? a.housing : undefined}
        onChange={(housing) =>
          set({
            housing,
            benefits: housing === "homeless" ? [...new Set([...a.benefits, "homeless"])] : a.benefits.filter((b) => b !== "homeless"),
          })
        }
        options={[
          { value: "rent", label: tr("I rent", "Alquilo") },
          { value: "own", label: tr("I own my home", "Soy dueño(a) de mi casa") },
          { value: "living_with_family", label: tr("I stay with family or friends", "Vivo con familiares o amigos"), hint: tr("Free or for help around the house", "Gratis o a cambio de ayudar en la casa") },
          { value: "homeless", label: tr("I don't have stable housing", "No tengo vivienda estable") },
          { value: "other", label: tr("Something else", "Otra situación") },
        ]}
      />
    ),
  },
  {
    id: "injury",
    title: [
      "Was this visit because of a car accident, a work injury, or an injury someone else may be responsible for?",
      "¿Fue esta visita por un accidente de auto, una lesión en el trabajo o una lesión de la que otra persona podría ser responsable?",
    ],
    help: ["Those claims are billed to the insurance or case first.", "Esos casos se cobran primero al seguro o al caso legal."],
    render: ({ a, set, answered, tr }) => <Choice options={yesNo(tr)} value={answered ? a.thirdPartyInjury : undefined} onChange={(thirdPartyInjury) => set({ thirdPartyInjury })} />,
  },
];

export default function Questions({ state, update, next, back, policy }: StepProps) {
  const { tr } = useLang();
  const s: QState = { ...state, policyPresumptive: [...new Set(policy.presumptive_eligibility.qualifying.map((q) => q.id))] };
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
      <p className="text-sm font-medium text-teal-700">{tr("Question", "Pregunta")} {index + 1} {tr("of", "de")} {visible.length}</p>
      <h1 className="text-2xl font-bold text-slate-900">{tr(...q.title)}</h1>
      {q.help && <p className="text-slate-600">{tr(...q.help)}</p>}
      <div key={q.id}>{q.render({ a, set, s, update: updateAndTouch, answered, tr })}</div>
      <Nav
        next={() => (last ? next() : setIndex(index + 1))}
        back={() => (index === 0 ? back() : setIndex(index - 1))}
        nextLabel={last ? tr("See my results", "Ver mis resultados") : tr("Next", "Siguiente")}
        nextDisabled={!answered || (q.valid ? !q.valid(a) : false)}
      />
    </>
  );
}
