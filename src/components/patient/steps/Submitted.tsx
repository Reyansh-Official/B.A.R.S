import { Card } from "@/components/ui";
import type { StepProps } from "../PatientFlow";

export default function Submitted({ policy, state }: StepProps) {
  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Sent to a counselor</h1>
      <Card>
        <p className="text-slate-700">
          Reference <span className="font-mono font-semibold">{state.applicationId}</span>. {policy.name} gives a
          probable decision within 2 business days and a final decision within 14 days of a complete application.
          Collections pause while it&apos;s reviewed.
        </p>
        <p className="mt-3 text-sm text-slate-600">Questions? Call {policy.contact.phone}.</p>
      </Card>
    </>
  );
}
