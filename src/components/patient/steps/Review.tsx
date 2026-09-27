import { useState } from "react";
import ApplicationPreview from "@/components/ApplicationPreview";
import SignaturePad from "@/components/SignaturePad";
import { Card } from "@/components/ui";
import { screen } from "@/lib/rules";
import type { Patient } from "@/lib/demo";
import type { StepProps } from "../PatientFlow";
import Nav from "./Nav";

const fields: { key: keyof Patient; label: string; type: string; autoComplete: string }[] = [
  { key: "name", label: "Full name", type: "text", autoComplete: "name" },
  { key: "dob", label: "Date of birth", type: "date", autoComplete: "bday" },
  { key: "address", label: "Mailing address", type: "text", autoComplete: "street-address" },
  { key: "phone", label: "Phone number", type: "tel", autoComplete: "tel" },
];

export default function Review({ policy, state, update, next, back }: StepProps) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [spouseName, setSpouseName] = useState("");
  const { patient, answers } = state;
  const screening = screen(policy, state.bills, answers, state.docs, state.medicaidStatus);
  const today = new Date().toLocaleDateString();

  const sign = (id: "signature" | "spouse_signature", who: string, dataUrl: string | null) => {
    const rest = Object.fromEntries(Object.entries(state.docs).filter(([k]) => k !== id));
    update({
      docs: dataUrl
        ? { ...rest, [id]: { status: "provided", note: `Signed electronically by ${who} on ${today}`, files: [{ name: `${id}.png`, type: "image/png", dataUrl }] } }
        : rest,
    });
  };

  const signed = (id: string) => state.docs[id]?.status === "provided";
  const detailsDone = fields.every((f) => patient[f.key].trim());
  const ready = detailsDone && agreed && signed("signature") && (!answers.married || (signed("spouse_signature") && spouseName.trim()));

  const submit = async () => {
    setSending(true);
    setError("");
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hospitalId: policy.id, ...state }),
    });
    setSending(false);
    if (!res.ok) return setError("Couldn't send. Please try again.");
    update({ applicationId: (await res.json()).id });
    next();
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Review and sign</h1>

      <Card>
        <h2 className="mb-3 font-semibold">Your details</h2>
        <div className="flex flex-col gap-3">
          {fields.map((f) => (
            <label key={f.key} className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              {f.label}
              <input
                type={f.type}
                autoComplete={f.autoComplete}
                value={patient[f.key]}
                onChange={(e) => update({ patient: { ...patient, [f.key]: e.target.value } })}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-base"
              />
            </label>
          ))}
        </div>
      </Card>

      <Card>
        <ApplicationPreview
          policyName={policy.name}
          patient={patient}
          answers={answers}
          bills={state.bills}
          screening={screening}
          medicaidStatus={state.medicaidStatus}
        />
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Sign your application</h2>
        <label className="mb-4 flex gap-3 text-sm text-slate-700">
          <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-teal-700" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>
            The information in this application is true and complete to the best of my knowledge. I understand false
            information can cancel any assistance. I allow {policy.name} to verify it, including checking my credit file,
            and to share it with University Physicians, Inc. to review help with my physician bills. I will tell them if
            my income or assets change while this is reviewed.
          </span>
        </label>
        <div className="flex flex-col gap-4">
          <SignaturePad label={`Signature: ${patient.name || "patient"}`} onChange={(d) => sign("signature", patient.name, d)} />
          {answers.married && (
            <>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Spouse&apos;s full name
                <input value={spouseName} onChange={(e) => setSpouseName(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-base" />
              </label>
              <SignaturePad label="Spouse's signature (required by the hospital)" onChange={(d) => sign("spouse_signature", spouseName || "spouse", d)} />
            </>
          )}
        </div>
      </Card>

      {!ready && (
        <p className="text-sm text-amber-800">
          {!detailsDone ? "Fill in your details above. " : ""}
          {!agreed ? "Check the box to agree. " : ""}
          {!signed("signature") || (answers.married && !signed("spouse_signature")) ? "Add the signature(s)." : ""}
        </p>
      )}
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <Nav next={submit} back={back} nextLabel={sending ? "Sending…" : "Send to a financial counselor"} nextDisabled={sending || !ready} />
    </>
  );
}
