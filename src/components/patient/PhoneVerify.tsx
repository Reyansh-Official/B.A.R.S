"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useLang } from "@/lib/i18n";

// Reminders only turn on after the patient enters the code we text them. Remount (key) when the phone number changes.
export default function PhoneVerify({ phone, onVerified }: { phone: string; onVerified: (id: string | null) => void }) {
  const { tr, lang } = useLang();
  const [wanted, setWanted] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string>();
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const call = async (body: object) => {
    setBusy(true);
    setError("");
    const res = await fetch("/api/verify-phone", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({ error: tr("Something went wrong. Try again.", "Algo salió mal. Intente de nuevo.") }));
    setBusy(false);
    if (!res.ok) setError(data.error);
    return res.ok ? data : null;
  };
  const send = async () => {
    const data = await call({ action: "start", phone, lang });
    if (data) { setId(data.id); setDevCode(data.devCode); setCode(""); }
  };
  const check = async () => {
    if (id && (await call({ action: "check", id, code, lang }))) { setVerified(true); onVerified(id); }
  };
  const toggle = (on: boolean) => {
    setWanted(on);
    if (!on) { setId(null); setVerified(false); onVerified(null); }
  };

  return (
    <div className="text-sm text-slate-700">
      <label className="flex gap-3">
        <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-teal-700" checked={wanted} disabled={!phone} onChange={(e) => toggle(e.target.checked)} />
        <span>
          <span className="font-semibold text-slate-900">
            {tr("Text me deadline reminders", "Enviarme recordatorios de fechas límite por mensaje de texto")}
            {phone ? ` ${tr("at", "al")} ${phone}` : ""}
          </span>{" "}
          {tr("(optional)", "(opcional)")}
          <br />
          {phone
            ? tr(
                "We'll text you if the hospital asks for more information and a few days before any deadline. About 1–6 messages per application. Msg & data rates may apply. Reply STOP to opt out.",
                "Le enviaremos un mensaje si el hospital pide más información y unos días antes de cada fecha límite. Unos 1–6 mensajes por solicitud. Pueden aplicar tarifas de mensajes y datos. Responda STOP para cancelar.",
              )
            : tr("Add your phone number above to get text reminders.", "Agregue su número de teléfono arriba para recibir recordatorios por mensaje de texto.")}
        </span>
      </label>

      {wanted && !verified && (
        <div className="ml-8 mt-3 flex flex-col gap-2">
          {!id ? (
            <button type="button" onClick={send} disabled={busy} className="self-start rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-50">
              {busy ? tr("Sending…", "Enviando…") : tr("Text me a code to confirm this number", "Enviarme un código para confirmar este número")}
            </button>
          ) : (
            <>
              <p>{tr(`Enter the 6-digit code we texted to ${phone}.`, `Escriba el código de 6 dígitos que enviamos al ${phone}.`)}{devCode && <span className="text-slate-500"> ({tr("Demo, texts are off:", "Demo, mensajes desactivados:")} {devCode})</span>}</p>
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label={tr("Verification code", "Código de verificación")}
                  className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-center text-lg tracking-widest"
                />
                <button type="button" onClick={check} disabled={busy || code.length !== 6} className="rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-50">
                  {busy ? tr("Checking…", "Verificando…") : tr("Confirm", "Confirmar")}
                </button>
              </div>
              <button type="button" onClick={send} disabled={busy} className="self-start text-teal-700 underline disabled:opacity-50">{tr("Send a new code", "Enviar un código nuevo")}</button>
            </>
          )}
          {error && <p className="text-rose-700">{error}</p>}
        </div>
      )}
      {wanted && verified && <p className="ml-8 mt-2 inline-flex items-center gap-1.5 font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" aria-hidden /> {tr("Number confirmed. Reminders are on.", "Número confirmado. Los recordatorios están activados.")}</p>}
    </div>
  );
}
