import { useRef, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { toUploadedFile } from "@/lib/files";
import { screen } from "@/lib/rules";
import type { Alternative, DocState, RequiredDoc } from "@/lib/types";
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

function DocCard({ doc, set }: { doc: RequiredDoc; set: (state: DocState | undefined) => void }) {
  const [mode, setMode] = useState<"idle" | "alternatives" | "counselor">("idle");
  const [form, setForm] = useState<Alternative | null>(null);
  const [explain, setExplain] = useState("");
  const [busy, setBusy] = useState(false);

  const upload = async (files: File[], alt?: Alternative) => {
    setBusy(true);
    const uploaded = await Promise.all(files.map(toUploadedFile));
    setBusy(false);
    set({ status: alt ? "alternative" : "provided", alternativeId: alt?.id, note: alt?.label, files: uploaded });
    setMode("idle");
  };

  const addMore = async (files: File[]) => {
    const uploaded = await Promise.all(files.map(toUploadedFile));
    set({ status: doc.status, alternativeId: undefined, note: doc.statusNote, files: [...(doc.files ?? []), ...uploaded] });
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
          {doc.files?.map((f, i) => <p key={i} className="text-slate-500">📎 {f.name}</p>)}
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

export default function Documents({ policy, state, update, next, back }: StepProps) {
  const { readiness } = screen(policy, state.bills, state.answers, state.docs, state.medicaidStatus);
  const docs = readiness.documents.filter((d) => !SIGNATURES.includes(d.id));
  const done = docs.filter((d) => d.status !== "missing").length;

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
        <DocCard key={d.id} doc={d} set={(v) => setDoc(d.id, v)} />
      ))}
      <p className="text-sm text-slate-500">You&apos;ll sign the application on the next screen.</p>
      <Nav next={next} back={back} nextLabel={done < docs.length ? "Continue, I'll finish later" : "Continue"} />
    </>
  );
}
