import { useRef, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { toUploadedFile } from "@/lib/files";
import { screen, screenEligibility } from "@/lib/rules";
import type { Alternative, DocCheck, DocState, RequiredDoc, UploadedFile } from "@/lib/types";
import type { StepProps } from "../PatientFlow";
import Nav from "./Nav";
import DocForm from "./DocForm";

const statusLabel = {
  provided: { tone: "good", text: "Added" },
  alternative: { tone: "good", text: "Added (alternative)" },
  missing: { tone: "warn", text: "Needed" },
  counselor: { tone: "info", text: "Counselor will help" },
} as const;

const SIGNATURES = ["signature", "spouse_signature"];

const sampleDocs: Record<string, { path: string; label: string }[]> = {
  income_proof: [
    { path: "/demo-docs/omar-paystub-1.pdf", label: "Omar: pay stub 1" },
    { path: "/demo-docs/omar-paystub-2.pdf", label: "Omar: pay stub 2" },
    { path: "/demo-docs/maria-paystub.pdf", label: "Maria: pay stub" },
    { path: "/demo-bills/aisha-ummc.pdf", label: "Wrong file (a bill)" },
  ],
  unemployment_proof: [{ path: "/demo-docs/james-ui-statement.pdf", label: "James: benefits notice" }],
};

async function checkFiles(docId: string, statedIncome: number, files: UploadedFile[]): Promise<DocCheck[]> {
  const results = await Promise.all(
    files.map(async (f) => {
      try {
        const body = new FormData();
        body.append("file", new File([await (await fetch(f.dataUrl)).blob()], f.name, { type: f.type }));
        body.append("docId", docId);
        body.append("statedIncome", String(statedIncome));
        const res = await fetch("/api/check-document", { method: "POST", body });
        return res.ok ? ((await res.json()) as DocCheck) : null;
      } catch {
        return null;
      }
    }),
  );
  return results.filter((r): r is DocCheck => r !== null);
}

const verdictStyle = {
  ok: { icon: "✓", cls: "border-emerald-200 bg-emerald-50 text-emerald-900" },
  warn: { icon: "!", cls: "border-amber-300 bg-amber-50 text-amber-900" },
  wrong_type: { icon: "✗", cls: "border-rose-300 bg-rose-50 text-rose-900" },
  unreadable: { icon: "✗", cls: "border-rose-300 bg-rose-50 text-rose-900" },
};

function CheckResult({ check, statedIncome, incomeHint, onUpdateIncome }: { check: DocCheck; statedIncome: number; incomeHint?: (n: number) => string; onUpdateIncome?: (n: number) => void }) {
  const v = verdictStyle[check.verdict];
  const pending = check.suggestedIncome != null && check.suggestedIncome > statedIncome;
  return (
    <div className={`mt-1 rounded-lg border p-2 text-sm ${v.cls}`}>
      <p className="font-medium"><span aria-hidden>{v.icon}</span> {check.summary}</p>
      {check.details.map((d) => <p key={d}>{d}</p>)}
      {check.suggestedIncome != null && onUpdateIncome && (
        pending ? (
          <div className="mt-2 flex flex-col gap-1">
            <button className="self-start rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white" onClick={() => onUpdateIncome(check.suggestedIncome!)}>
              Update my income to ${check.suggestedIncome.toLocaleString()}
            </button>
            {incomeHint && <p className="text-xs">{incomeHint(check.suggestedIncome)}</p>}
            <p className="text-xs">If others in your household also earn money, add theirs too. Or leave it and your counselor will sort it out.</p>
          </div>
        ) : (
          <p className="mt-1 font-medium">Income updated ✓</p>
        )
      )}
    </div>
  );
}

function FilePicker({ label, onFiles, variant = "primary" }: { label: string; onFiles: (files: File[]) => void; variant?: "primary" | "secondary" }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        multiple
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
      <Button variant={variant} onClick={() => input.current?.click()}>{label}</Button>
    </>
  );
}

function AddMore({ onFiles }: { onFiles: (files: File[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={input} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => { const files = [...(e.target.files ?? [])]; e.target.value = ""; if (files.length) onFiles(files); }} />
      <button className="text-sm text-teal-700 underline" onClick={() => input.current?.click()}>+ Add another file</button>
    </>
  );
}

export interface DocCardProps {
  doc: RequiredDoc;
  set: (state: DocState | undefined) => void;
  statedIncome: number;
  incomeHint?: (n: number) => string;
  onUpdateIncome?: (n: number) => void;
  samples?: { path: string; label: string }[];
}

export function DocCard({ doc, set, statedIncome, incomeHint, onUpdateIncome, samples }: DocCardProps) {
  const [mode, setMode] = useState<"idle" | "alternatives" | "counselor">("idle");
  const [form, setForm] = useState<Alternative | null>(null);
  const [explain, setExplain] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);

  const upload = async (files: File[], alt?: Alternative) => {
    setBusy(true);
    const uploaded = await Promise.all(files.map(toUploadedFile));
    setBusy(false);
    const next: DocState = { status: alt ? "alternative" : "provided", alternativeId: alt?.id, note: alt?.label, files: uploaded };
    set(next);
    setMode("idle");
    setChecking(true);
    set({ ...next, checks: await checkFiles(doc.id, statedIncome, uploaded) });
    setChecking(false);
  };

  const addMore = async (files: File[]) => {
    const uploaded = await Promise.all(files.map(toUploadedFile));
    const next: DocState = { status: doc.status, note: doc.statusNote, files: [...(doc.files ?? []), ...uploaded], checks: doc.checks };
    set(next);
    setChecking(true);
    set({ ...next, checks: [...(doc.checks ?? []), ...(await checkFiles(doc.id, statedIncome, uploaded))] });
    setChecking(false);
  };

  const removeFile = (index: number) => {
    const files = (doc.files ?? []).filter((_, i) => i !== index);
    if (!files.length) return set(undefined);
    const removed = doc.files![index].name;
    set({ status: doc.status, note: doc.statusNote, files, checks: doc.checks?.filter((c) => c.fileName !== removed) });
  };

  const loadSample = async (path: string) => {
    const blob = await (await fetch(path)).blob();
    const file = new File([blob], path.split("/").pop()!, { type: "application/pdf" });
    if (doc.status === "missing") await upload([file]);
    else await addMore([file]);
  };

  const label = statusLabel[doc.status];
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold">{doc.label}</p>
        <Badge tone={label.tone}>{label.text}</Badge>
      </div>
      {doc.note && doc.status === "missing" && <p className="mt-1 text-sm text-slate-500">{doc.note}</p>}

      {doc.status !== "missing" && (
        <div className="mt-2 text-sm text-slate-700">
          {doc.statusNote && <p>{doc.statusNote}</p>}
          {doc.files?.map((f, i) => {
            const check = doc.checks?.find((c) => c.fileName === f.name);
            return (
              <div key={i} className="mt-2">
                <p className="flex items-center justify-between gap-2 text-slate-500">
                  <span>📎 {f.name}</span>
                  <button className="text-xs underline" onClick={() => removeFile(i)}>Remove</button>
                </p>
                {check && <CheckResult check={check} statedIncome={statedIncome} incomeHint={incomeHint} onUpdateIncome={onUpdateIncome} />}
              </div>
            );
          })}
          {checking && (
            <p className="mt-2 inline-flex items-center gap-2 text-slate-500">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
              Checking your document…
            </p>
          )}
          <div className="mt-2 flex gap-4">
            {doc.files && doc.files.length > 0 && <AddMore onFiles={addMore} />}
            <button className="text-sm text-teal-700 underline" onClick={() => set(undefined)}>Change</button>
          </div>
        </div>
      )}

      {doc.status === "missing" && mode === "idle" && (
        <div className="mt-3 flex flex-col gap-2">
          <FilePicker label={busy ? "Adding…" : "Upload or take a photo"} onFiles={(f) => upload(f)} />
          <Button variant="secondary" onClick={() => setMode("alternatives")}>I don&apos;t have this</Button>
        </div>
      )}

      {samples && samples.length > 0 && mode === "idle" && (
        <details className="mt-2 text-sm text-slate-500">
          <summary className="cursor-pointer">Try a sample document</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {samples.map((s) => (
              <button key={s.path} disabled={busy || checking} onClick={() => loadSample(s.path)} className="rounded-full border border-slate-300 bg-white px-3 py-1 disabled:opacity-50">
                {s.label}
              </button>
            ))}
          </div>
        </details>
      )}

      {doc.status === "missing" && mode === "alternatives" && !form && (
        <div className="mt-3 flex flex-col gap-3 rounded-xl bg-slate-50 p-3">
          {doc.alternatives.length > 0 ? (
            <>
              <p className="text-sm font-semibold text-slate-800">That&apos;s OK. The hospital also accepts:</p>
              {doc.alternatives.map((alt) => (
                <div key={alt.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="font-medium">{alt.label}</p>
                  {alt.hint && <p className="mb-2 text-sm text-slate-500">{alt.hint}</p>}
                  {alt.kind === "upload" ? (
                    <FilePicker variant="secondary" label="Upload this instead" onFiles={(f) => upload(f, alt)} />
                  ) : (
                    <Button variant="secondary" onClick={() => setForm(alt)}>Fill it out here</Button>
                  )}
                </div>
              ))}
            </>
          ) : (
            <p className="text-sm text-slate-700">There&apos;s no substitute for this one, but a counselor can help you get it.</p>
          )}
          <button className="text-left text-sm font-semibold text-teal-700 underline" onClick={() => setMode("counselor")}>
            None of these work for me
          </button>
          <button className="text-left text-sm text-slate-500 underline" onClick={() => setMode("idle")}>Back</button>
        </div>
      )}

      {form && (
        <DocForm
          alt={form}
          onCancel={() => setForm(null)}
          onDone={(note) => {
            set({ status: "alternative", alternativeId: form.id, note });
            setForm(null);
            setMode("idle");
          }}
        />
      )}

      {doc.status === "missing" && mode === "counselor" && (
        <div className="mt-3 flex flex-col gap-2 rounded-xl bg-sky-50 p-3">
          <p className="text-sm text-sky-900">
            A financial counselor will help you with this. You can also explain over the phone. Missing paperwork alone
            can&apos;t be a reason to deny you.
          </p>
          <textarea
            className="rounded-lg border border-slate-300 bg-white p-2 text-base"
            rows={3}
            placeholder="Optional: tell them what's going on (e.g. I get paid in cash)"
            value={explain}
            onChange={(e) => setExplain(e.target.value)}
          />
          <Button onClick={() => { set({ status: "counselor", note: explain.trim() || "Patient asked for help with this document." }); setMode("idle"); }}>
            Ask a counselor to help
          </Button>
          <button className="text-sm text-slate-500 underline" onClick={() => setMode("alternatives")}>Back</button>
        </div>
      )}
    </Card>
  );
}

export default function Documents({ policy, primaryBills, state, update, next, back }: StepProps) {
  const { readiness } = screen(policy, primaryBills, state.answers, state.docs, state.medicaidStatus);
  const docs = readiness.documents.filter((d) => !SIGNATURES.includes(d.id));
  const done = docs.filter((d) => d.status !== "missing").length;

  const incomeHint = (annualIncome: number) => {
    const now = screenEligibility(policy, state.answers, 0);
    const then = screenEligibility(policy, { ...state.answers, annualIncome }, 0);
    const describe = (e: typeof now) =>
      e.status === "presumptive" || (e.status === "potentially_eligible" && e.discountPct === 100)
        ? "free care"
        : e.status === "potentially_eligible" ? `a ${e.discountPct}% discount` : "a counselor review";
    return describe(now) === describe(then)
      ? `You'd still likely qualify for ${describe(then)}.`
      : `Your estimate would change from ${describe(now)} to ${describe(then)}.`;
  };

  const setDoc = (id: string, value: DocState | undefined) => {
    const rest = Object.fromEntries(Object.entries(state.docs).filter(([k]) => k !== id));
    update({ docs: value ? { ...rest, [id]: value } : rest });
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Your documents</h1>
      <p className="text-slate-600">
        {docs.length === 0
          ? "Good news: you don't need to send any documents."
          : `${done} of ${docs.length} taken care of. Don't have something? Tap "I don't have this" to see what else works.`}
      </p>
      {docs.map((d) => (
        <DocCard
          key={d.id}
          doc={d}
          set={(v) => setDoc(d.id, v)}
          statedIncome={state.answers.annualIncome}
          onUpdateIncome={(annualIncome) => update({ answers: { ...state.answers, annualIncome } })}
          incomeHint={incomeHint}
          samples={sampleDocs[d.id]}
        />
      ))}
      <p className="text-sm text-slate-500">You&apos;ll sign the application on the next screen.</p>
      <Nav next={next} back={back} nextLabel={done < docs.length ? "Continue, I'll finish later" : "Continue"} />
    </>
  );
}
