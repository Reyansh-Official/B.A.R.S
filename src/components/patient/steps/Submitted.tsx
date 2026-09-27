import ApplicationStatus from "../ApplicationStatus";
import type { StepProps } from "../PatientFlow";

export default function Submitted({ policies, state }: StepProps) {
  const apps = state.applications ?? [];
  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Sent to {apps.length > 1 ? `${apps.length} hospitals` : "a counselor"}</h1>
      {apps.map((a, i) => {
        const policy = policies[a.hospitalId];
        const link = `/h/${a.hospitalId}/a/${a.id}?t=${a.accessToken}`;
        return (
          <section key={a.id} className="flex flex-col gap-3">
            {apps.length > 1 && <h2 className="font-semibold text-slate-900">{a.hospitalName}</h2>}
            {i === 0 && policy ? (
              <ApplicationStatus id={a.id} token={a.accessToken} policy={policy} />
            ) : (
              <p className="text-sm text-slate-600">Reference {a.id}. Their counselors will review your {a.hospitalName} bill separately.</p>
            )}
            <p className="text-xs text-slate-500">
              Save this private link (don&apos;t share it): <a className="underline" href={link}>{a.hospitalName} status page</a>
            </p>
          </section>
        );
      })}
    </>
  );
}
