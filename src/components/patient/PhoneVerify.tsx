"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";

// Reminders only turn on after the patient enters the code we text them. Remount (key) when the phone number changes.
export default function PhoneVerify({ phone, onVerified }: { phone: string; onVerified: (id: string | null) => void }) {
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
    const data = await res.json().catch(() => ({ error: "Something went wrong. Try again." }));
    setBusy(false);
    if (!res.ok) setError(data.error);
    return res.ok ? data : null;
  };
  const send = async () => {
    const data = await call({ action: "start", phone });
    if (data) { setId(data.id); setDevCode(data.devCode); setCode(""); }
  };
  const check = async () => {
    if (id && (await call({ action: "check", id, code }))) { setVerified(true); onVerified(id); }
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
          <span className="font-semibold text-slate-900">Text me deadline reminders{phone ? ` at ${phone}` : ""}</span> (optional)
          <br />
          {phone ? "We'll text you if the hospital asks for more information and a few days before any deadline. About 1–6 messages per application. Msg & data rates may apply. Reply STOP to opt out." : "Add your phone number above to get text reminders."}
        </span>
      </label>

      {wanted && !verified && (
        <div className="ml-8 mt-3 flex flex-col gap-2">
          {!id ? (
            <button type="button" onClick={send} disabled={busy} className="self-start rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-50">
              {busy ? "Sending…" : "Text me a code to confirm this number"}
            </button>
          ) : (
            <>
              <p>Enter the 6-digit code we texted to {phone}.{devCode && <span className="text-slate-500"> (Demo, texts are off: {devCode})</span>}</p>
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label="Verification code"
                  className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-center text-lg tracking-widest"
                />
                <button type="button" onClick={check} disabled={busy || code.length !== 6} className="rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-50">
                  {busy ? "Checking…" : "Confirm"}
                </button>
              </div>
              <button type="button" onClick={send} disabled={busy} className="self-start text-teal-700 underline disabled:opacity-50">Send a new code</button>
            </>
          )}
          {error && <p className="text-rose-700">{error}</p>}
        </div>
      )}
      {wanted && verified && <p className="ml-8 mt-2 inline-flex items-center gap-1.5 font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" aria-hidden /> Number confirmed. Reminders are on.</p>}
    </div>
  );
}
