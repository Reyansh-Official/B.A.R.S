import ApplicationStatus from "../ApplicationStatus";
import { useLang } from "@/lib/i18n";
import type { StepProps } from "../PatientFlow";

export default function Submitted({ policies, state }: StepProps) {
  const { tr } = useLang();
  const apps = state.applications ?? [];
  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">{apps.length > 1 ? tr(`Sent to ${apps.length} hospitals`, `Enviada a ${apps.length} hospitales`) : tr("Sent to a counselor", "Enviada a un consejero")}</h1>
      {apps.map((a, i) => {
        const policy = policies[a.hospitalId];
        const link = `/h/${a.hospitalId}/a/${a.id}?t=${a.accessToken}`;
        return (
          <section key={a.id} className="flex flex-col gap-3">
            {apps.length > 1 && <h2 className="font-semibold text-slate-900">{a.hospitalName}</h2>}
            {i === 0 && policy ? (
              <ApplicationStatus id={a.id} token={a.accessToken} policy={policy} />
            ) : (
              <p className="text-sm text-slate-600">{tr(`Reference ${a.id}. Their counselors will review your ${a.hospitalName} bill separately.`, `Referencia ${a.id}. Sus consejeros revisarán aparte su factura de ${a.hospitalName}.`)}</p>
            )}
            <p className="text-xs text-slate-500">
              {tr("Save this private link (don't share it):", "Guarde este enlace privado (no lo comparta):")}{" "}
              <a className="underline" href={link}>{tr(`${a.hospitalName} status page`, `Página de estado de ${a.hospitalName}`)}</a>
            </p>
          </section>
        );
      })}
    </>
  );
}
