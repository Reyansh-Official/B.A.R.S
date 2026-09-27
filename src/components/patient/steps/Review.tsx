import { useState } from "react";
import { Card, Todo } from "@/components/ui";
import type { StepProps } from "../PatientFlow";
import Nav from "./Nav";

export default function Review({ policy, state, update, next, back }: StepProps) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

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
      <h1 className="text-2xl font-bold text-slate-900">Review and send</h1>
      <Card>
        <p className="font-semibold">{state.patient.name || "Patient"}</p>
        <p className="text-sm text-slate-600">{state.patient.address}</p>
      </Card>
      <Todo>Prefilled application preview matching the hospital&apos;s form, plus e-signature (and spouse signature if married).</Todo>
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <Nav next={submit} back={back} nextLabel={sending ? "Sending…" : "Send to a financial counselor"} nextDisabled={sending} />
    </>
  );
}
