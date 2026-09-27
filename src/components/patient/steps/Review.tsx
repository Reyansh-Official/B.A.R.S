import { useState } from "react";
import ApplicationPreview from "@/components/ApplicationPreview";
import SignaturePad from "@/components/SignaturePad";
import PhoneVerify from "../PhoneVerify";
import { Card } from "@/components/ui";
import { screen } from "@/lib/rules";
import type { Patient } from "@/lib/demo";
import { useLang } from "@/lib/i18n";
import type { StepProps } from "../PatientFlow";
import Nav from "./Nav";

const fields: { key: keyof Patient; label: string; es: string; type: string; autoComplete: string }[] = [
  { key: "name", label: "Full name", es: "Nombre completo", type: "text", autoComplete: "name" },
  { key: "dob", label: "Date of birth", es: "Fecha de nacimiento", type: "date", autoComplete: "bday" },
  { key: "address", label: "Mailing address", es: "Dirección postal", type: "text", autoComplete: "street-address" },
  { key: "phone", label: "Phone number", es: "Número de teléfono", type: "tel", autoComplete: "tel" },
];

export default function Review({ policy, primaryBills, groups, state, update, next, back }: StepProps) {
  const { tr, lang } = useLang();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [spouseName, setSpouseName] = useState("");
  // Tied to the number it was verified for, so editing the phone turns reminders back off.
  const [verification, setVerification] = useState<{ id: string; phone: string } | null>(null);
  const { patient, answers } = state;
  const phoneVerificationId = verification?.phone === patient.phone ? verification.id : null;
  const screening = screen(policy, primaryBills, answers, state.docs, state.medicaidStatus);
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

  // Each hospital's counselors only see their own bills, so send one application per live hospital.
  const liveGroups = groups.filter((g) => g.status === "live" && g.hospitalId);
  const submit = async () => {
    setSending(true);
    setError("");
    const sent: NonNullable<typeof state.applications> = [];
    for (const g of liveGroups) {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...state, hospitalId: g.hospitalId, bills: g.bills, textReminders: Boolean(phoneVerificationId), phoneVerificationId, lang }),
      });
      if (!res.ok) {
        setSending(false);
        return setError(tr(`Couldn't send to ${g.hospitalName}. Please try again.`, `No se pudo enviar a ${g.hospitalName}. Intente de nuevo.`));
      }
      const { id, accessToken } = await res.json();
      sent.push({ hospitalId: g.hospitalId!, hospitalName: g.hospitalName, id, accessToken });
    }
    setSending(false);
    update({ applications: sent, applicationId: sent[0]?.id, accessToken: sent[0]?.accessToken });
    next();
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">{tr("Review and sign", "Revise y firme")}</h1>

      <Card>
        <h2 className="mb-3 font-semibold">{tr("Your details", "Sus datos")}</h2>
        <div className="flex flex-col gap-3">
          {fields.map((f) => (
            <label key={f.key} className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              {tr(f.label, f.es)}
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
        {lang === "es" && <p className="mb-3 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">Así se verá su solicitud para el hospital (en inglés).</p>}
        <ApplicationPreview
          policyName={policy.name}
          patient={patient}
          answers={answers}
          bills={primaryBills}
          screening={screening}
          medicaidStatus={state.medicaidStatus}
        />
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">{tr("Sign your application", "Firme su solicitud")}</h2>
        <label className="mb-4 flex gap-3 text-sm text-slate-700">
          <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-teal-700" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>
            {tr(
              `The information in this application is true and complete to the best of my knowledge. I understand false information can cancel any assistance. I allow ${policy.name} to verify it, including checking my credit file, and to share it with University Physicians, Inc. to review help with my physician bills. I will tell them if my income or assets change while this is reviewed.`,
              `La información de esta solicitud es verdadera y completa según mi mejor conocimiento. Entiendo que la información falsa puede cancelar cualquier asistencia. Autorizo a ${policy.name} a verificarla, incluso revisando mi historial de crédito, y a compartirla con University Physicians, Inc. para evaluar ayuda con mis facturas de médicos. Les avisaré si mis ingresos o bienes cambian mientras se revisa.`,
            )}
          </span>
        </label>
        <div className="flex flex-col gap-4">
          <SignaturePad label={`${tr("Signature", "Firma")}: ${patient.name || tr("patient", "paciente")}`} onChange={(d) => sign("signature", patient.name, d)} />
          {answers.married && (
            <>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                {tr("Spouse's full name", "Nombre completo del cónyuge")}
                <input value={spouseName} onChange={(e) => setSpouseName(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-base" />
              </label>
              <SignaturePad label={tr("Spouse's signature (required by the hospital)", "Firma del cónyuge (requerida por el hospital)")} onChange={(d) => sign("spouse_signature", spouseName || "spouse", d)} />
            </>
          )}
        </div>
      </Card>

      <Card>
        <PhoneVerify key={patient.phone} phone={patient.phone} onVerified={(id) => setVerification(id ? { id, phone: patient.phone } : null)} />
      </Card>

      {!ready && (
        <p className="text-sm text-amber-800">
          {!detailsDone ? tr("Fill in your details above. ", "Complete sus datos arriba. ") : ""}
          {!agreed ? tr("Check the box to agree. ", "Marque la casilla para aceptar. ") : ""}
          {!signed("signature") || (answers.married && !signed("spouse_signature")) ? tr("Add the signature(s).", "Agregue la(s) firma(s).") : ""}
        </p>
      )}
      {liveGroups.length === 0 && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          {tr(
            "None of your bills are from a hospital we can send to yet. Once their policy is approved, come back and upload the bill again to send an application.",
            "Ninguna de sus facturas es de un hospital al que podamos enviar todavía. Cuando se apruebe su póliza, vuelva y suba la factura otra vez para enviar una solicitud.",
          )}
        </p>
      )}
      {liveGroups.length > 1 && <p className="text-sm text-slate-600">{tr("This will send separate applications to", "Esto enviará solicitudes separadas a")} {liveGroups.map((g) => g.hospitalName).join(tr(" and ", " y "))}.</p>}
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <Nav next={submit} back={back} nextLabel={sending ? tr("Sending…", "Enviando…") : tr("Send to a financial counselor", "Enviar a un consejero financiero")} nextDisabled={sending || !ready || liveGroups.length === 0} />
    </>
  );
}
