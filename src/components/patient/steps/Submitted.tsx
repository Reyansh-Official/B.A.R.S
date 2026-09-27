import ApplicationStatus from "../ApplicationStatus";
import type { StepProps } from "../PatientFlow";

export default function Submitted({ policy, state }: StepProps) {
  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Sent to a counselor</h1>
      {state.applicationId && (
        <>
          <ApplicationStatus id={state.applicationId} policy={policy} />
          <p className="text-xs text-slate-500">
            Come back anytime: <a className="underline" href={`/h/${policy.id}/a/${state.applicationId}`}>your application status page</a>
          </p>
        </>
      )}
    </>
  );
}
