import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui";
import { Auto, useLang } from "@/lib/i18n";
import type { Alternative } from "@/lib/types";

const input = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-base";

function Radio({ name, options, value, onChange }: { name: string; options: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      {options.map(([v, label]) => (
        <label key={v} className="flex items-center gap-2 text-sm">
          <input type="radio" name={name} className="h-4 w-4 accent-teal-700" checked={value === v} onChange={() => onChange(v)} />
          {label}
        </label>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  );
}

// In-app versions of the UMMS application's Form FAF 116 sections; the note (kept in English) becomes the counselor-visible record.
export default function DocForm({ alt, onDone, onCancel }: { alt: Alternative; onDone: (note: string) => void; onCancel: () => void }) {
  const { tr } = useLang();
  const [f, setF] = useState<Record<string, string>>({});
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const text = (k: string) => ({ value: f[k] ?? "", onChange: (e: { target: { value: string } }) => set(k)(e.target.value) });

  let body: ReactNode;
  let note = "";
  let valid = false;

  if (alt.form === "faf116_shelter") {
    const arrangement =
      f.arrangement === "free" ? "room and board free" : f.arrangement === "paying" ? `paying $${f.amount || "?"} per month for room and board` : `other: ${f.other ?? ""}`;
    note = `FAF 116: receiving help with food and shelter from ${f.name ?? ""} (${f.relationship ?? ""}), ${arrangement}.`;
    valid = Boolean(f.name && f.relationship && f.arrangement && (f.arrangement !== "paying" || f.amount) && (f.arrangement !== "other" || f.other));
    body = (
      <>
        <Field label={tr("Who is helping you with food and housing?", "¿Quién le ayuda con comida y vivienda?")}><input className={input} {...text("name")} placeholder={tr("Their name", "Su nombre")} /></Field>
        <Field label={tr("How are they related to you?", "¿Qué relación tiene con usted?")}><input className={input} {...text("relationship")} placeholder={tr("e.g. sister, friend", "p. ej., hermana, amigo")} /></Field>
        <Radio name="arrangement" value={f.arrangement ?? ""} onChange={set("arrangement")} options={[["free", tr("They provide room and board for free", "Me dan casa y comida gratis")], ["paying", tr("I pay them something each month", "Les pago algo cada mes")], ["other", tr("Something else", "Otra situación")]]} />
        {f.arrangement === "paying" && <Field label={tr("How much per month?", "¿Cuánto al mes?")}><input className={input} inputMode="decimal" {...text("amount")} /></Field>}
        {f.arrangement === "other" && <Field label={tr("Please explain", "Explique por favor")}><textarea className={input} rows={2} {...text("other")} /></Field>}
      </>
    );
  } else if (alt.form === "faf116_unemployed") {
    const living = f.living === "help" ? "receiving help with food and shelter" : `living off savings or other money (${f.savings ?? ""})`;
    const reason = f.reason === "expired" ? "unemployment benefits ran out" : `not eligible for unemployment: ${f.why ?? ""}`;
    note = `FAF 116: unemployed since ${f.since ?? ""}, ${living}; ${reason}.${f.back ? ` Expects to return to work ${f.back}.` : ""}`;
    valid = Boolean(f.since && f.living && f.reason && (f.living !== "savings" || f.savings) && (f.reason !== "not_eligible" || f.why));
    body = (
      <>
        <Field label={tr("When did you stop working?", "¿Cuándo dejó de trabajar?")}><input type="date" className={input} {...text("since")} /></Field>
        <p className="text-sm font-medium text-slate-700">{tr("How are you getting by?", "¿Cómo se está manteniendo?")}</p>
        <Radio name="living" value={f.living ?? ""} onChange={set("living")} options={[["help", tr("Someone helps me with food and housing", "Alguien me ayuda con comida y vivienda")], ["savings", tr("Savings or other money", "Ahorros u otro dinero")]]} />
        {f.living === "savings" && <Field label={tr("Briefly explain", "Explique brevemente")}><textarea className={input} rows={2} {...text("savings")} /></Field>}
        <p className="text-sm font-medium text-slate-700">{tr("Why aren't you getting unemployment benefits?", "¿Por qué no recibe beneficios de desempleo?")}</p>
        <Radio name="reason" value={f.reason ?? ""} onChange={set("reason")} options={[["expired", tr("My benefits ran out", "Se me acabaron los beneficios")], ["not_eligible", tr("I'm not eligible", "No soy elegible")]]} />
        {f.reason === "not_eligible" && <Field label={tr("Why not?", "¿Por qué no?")}><input className={input} {...text("why")} /></Field>}
        <Field label={tr("When do you expect to go back to work? (optional)", "¿Cuándo espera volver a trabajar? (opcional)")}><input className={input} {...text("back")} placeholder={tr("e.g. unsure, next month", "p. ej., no sé, el próximo mes")} /></Field>
      </>
    );
  } else {
    note = `Living situation: ${f.statement ?? ""}`;
    valid = Boolean(f.statement?.trim());
    body = (
      <Field label={tr("Describe where you live and how you pay for it", "Describa dónde vive y cómo lo paga")}>
        <textarea className={input} rows={4} {...text("statement")} placeholder={tr("e.g. I rent a room month to month and pay my landlord in cash", "p. ej., alquilo un cuarto mes a mes y le pago al dueño en efectivo")} />
      </Field>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-xl border border-teal-200 bg-teal-50/50 p-3">
      <p className="font-semibold"><Auto>{alt.label}</Auto></p>
      {body}
      <Button disabled={!valid} onClick={() => onDone(note)}>{tr("Save", "Guardar")}</Button>
      <button className="text-sm text-slate-500 underline" onClick={onCancel}>{tr("Back", "Atrás")}</button>
    </div>
  );
}
