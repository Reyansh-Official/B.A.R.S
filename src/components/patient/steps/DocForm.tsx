import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui";
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

// In-app versions of the UMMS application's Form FAF 116 sections; the note becomes the counselor-visible record.
export default function DocForm({ alt, onDone, onCancel }: { alt: Alternative; onDone: (note: string) => void; onCancel: () => void }) {
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
        <Field label="Who is helping you with food and housing?"><input className={input} {...text("name")} placeholder="Their name" /></Field>
        <Field label="How are they related to you?"><input className={input} {...text("relationship")} placeholder="e.g. sister, friend" /></Field>
        <Radio name="arrangement" value={f.arrangement ?? ""} onChange={set("arrangement")} options={[["free", "They provide room and board for free"], ["paying", "I pay them something each month"], ["other", "Something else"]]} />
        {f.arrangement === "paying" && <Field label="How much per month?"><input className={input} inputMode="decimal" {...text("amount")} /></Field>}
        {f.arrangement === "other" && <Field label="Please explain"><textarea className={input} rows={2} {...text("other")} /></Field>}
      </>
    );
  } else if (alt.form === "faf116_unemployed") {
    const living = f.living === "help" ? "receiving help with food and shelter" : `living off savings or other money (${f.savings ?? ""})`;
    const reason = f.reason === "expired" ? "unemployment benefits ran out" : `not eligible for unemployment: ${f.why ?? ""}`;
    note = `FAF 116: unemployed since ${f.since ?? ""}, ${living}; ${reason}.${f.back ? ` Expects to return to work ${f.back}.` : ""}`;
    valid = Boolean(f.since && f.living && f.reason && (f.living !== "savings" || f.savings) && (f.reason !== "not_eligible" || f.why));
    body = (
      <>
        <Field label="When did you stop working?"><input type="date" className={input} {...text("since")} /></Field>
        <p className="text-sm font-medium text-slate-700">How are you getting by?</p>
        <Radio name="living" value={f.living ?? ""} onChange={set("living")} options={[["help", "Someone helps me with food and housing"], ["savings", "Savings or other money"]]} />
        {f.living === "savings" && <Field label="Briefly explain"><textarea className={input} rows={2} {...text("savings")} /></Field>}
        <p className="text-sm font-medium text-slate-700">Why aren&apos;t you getting unemployment benefits?</p>
        <Radio name="reason" value={f.reason ?? ""} onChange={set("reason")} options={[["expired", "My benefits ran out"], ["not_eligible", "I'm not eligible"]]} />
        {f.reason === "not_eligible" && <Field label="Why not?"><input className={input} {...text("why")} /></Field>}
        <Field label="When do you expect to go back to work? (optional)"><input className={input} {...text("back")} placeholder="e.g. unsure, next month" /></Field>
      </>
    );
  } else {
    note = `Living situation: ${f.statement ?? ""}`;
    valid = Boolean(f.statement?.trim());
    body = (
      <Field label="Describe where you live and how you pay for it">
        <textarea className={input} rows={4} {...text("statement")} placeholder="e.g. I rent a room month to month and pay my landlord in cash" />
      </Field>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-xl border border-teal-200 bg-teal-50/50 p-3">
      <p className="font-semibold">{alt.label}</p>
      {body}
      <Button disabled={!valid} onClick={() => onDone(note)}>Save</Button>
      <button className="text-sm text-slate-500 underline" onClick={onCancel}>Back</button>
    </div>
  );
}
