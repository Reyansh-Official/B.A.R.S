import { AlertTriangle, Building2, CheckCircle2, ChevronDown, ExternalLink, Hourglass, Info, Phone, ShieldPlus } from "lucide-react";
import type { ReactNode } from "react";
import { money } from "@/components/ui";
import { ageFromDob, medicaidProgram } from "@/lib/programs";
import { screen } from "@/lib/rules";
import type { Bill, Screening } from "@/lib/types";
import { Auto, useLang } from "@/lib/i18n";
import type { StepProps } from "../PatientFlow";
import CalendarButton from "../CalendarButton";
import Nav from "./Nav";

type Tone = "good" | "warn" | "info";

const tones: Record<Tone, { icon: typeof CheckCircle2; ring: string; iconCls: string; badge: string }> = {
  good: { icon: CheckCircle2, ring: "border-l-emerald-500", iconCls: "text-emerald-600", badge: "bg-emerald-100 text-emerald-800" },
  warn: { icon: AlertTriangle, ring: "border-l-amber-500", iconCls: "text-amber-600", badge: "bg-amber-100 text-amber-900" },
  info: { icon: Info, ring: "border-l-sky-500", iconCls: "text-sky-600", badge: "bg-sky-100 text-sky-900" },
};

const coverageLabel = {
  covered: { tone: "good", text: "Covered", es: "Cubierta" },
  separate_program: { tone: "info", text: "Separate program", es: "Programa aparte" },
  counselor_review: { tone: "warn", text: "Counselor will check", es: "El consejero revisará" },
} as const;

const eligibilityLabel = {
  presumptive: { tone: "good", text: "Likely free care", es: "Probable atención gratuita" },
  potentially_eligible: { tone: "good", text: "Potentially eligible", es: "Posiblemente elegible" },
  hardship_review: { tone: "info", text: "Hardship review", es: "Revisión por dificultad económica" },
  not_eligible_by_income: { tone: "warn", text: "Above income limits", es: "Por encima del límite de ingresos" },
  counselor_review: { tone: "info", text: "Counselor review", es: "Revisión del consejero" },
} as const;

const readinessLabel = {
  ready: { tone: "good", text: "Ready", es: "Lista" },
  missing_info: { tone: "warn", text: "A few things missing", es: "Faltan algunas cosas" },
  counselor_review: { tone: "info", text: "Counselor will help", es: "El consejero le ayudará" },
} as const;

function StatusCard({ n, question, tone, badge, children, why }: { n: number; question: string; tone: Tone; badge: string; children: ReactNode; why?: ReactNode }) {
  const t = tones[tone];
  const { tr } = useLang();
  return (
    <section className={`rounded-2xl border border-l-4 border-slate-200 bg-white p-5 ${t.ring}`}>
      <div className="flex items-start gap-3">
        <t.icon className={`mt-0.5 h-5 w-5 shrink-0 ${t.iconCls}`} aria-hidden />
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{tr("Question", "Pregunta")} {n}</p>
          <h2 className="font-semibold text-slate-900">{question}</h2>
          <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-sm font-semibold ${t.badge}`}>{badge}</span>
          <div className="mt-3 text-sm text-slate-700">{children}</div>
          {why && (
            <details className="group mt-3 text-sm">
              <summary className="flex cursor-pointer list-none items-center gap-1 font-medium text-teal-700">
                {tr("Why?", "¿Por qué?")} <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="mt-2 rounded-lg bg-slate-50 p-3 text-slate-600">{why}</div>
            </details>
          )}
        </div>
      </div>
    </section>
  );
}

const fmtDate = (d: string, lang: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString(lang === "es" ? "es-US" : "en-US", { month: "long", day: "numeric", year: "numeric" });

function MedicaidCard({ m, bills }: { m: NonNullable<Screening["medicaid"]>; bills: Bill[] }) {
  const p = medicaidProgram;
  const { tr, lang } = useLang();
  const covered = bills.filter((b) => m.coveredBills.some((c) => c.billId === b.id));
  return (
    <section className="rounded-3xl border-2 border-violet-300 bg-violet-50 p-5">
      <div className="flex items-start gap-3">
        <ShieldPlus className="mt-0.5 h-6 w-6 shrink-0 text-violet-700" aria-hidden />
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">{m.status === "likely" ? tr("Even better", "Aún mejor") : tr("Worth checking", "Vale la pena revisar")}</p>
          <h2 className="text-xl font-bold text-slate-900">
            {m.status === "likely" ? tr("You may qualify for Maryland Medicaid", "Usted podría calificar para Medicaid de Maryland") : tr("You might still qualify for Maryland Medicaid", "Aún podría calificar para Medicaid de Maryland")}
          </h2>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-700"><Auto>{m.reason}</Auto></p>
      <ul className="mt-4 flex flex-col gap-2 text-sm text-slate-800">
        {covered.length > 0 && (
          <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-violet-700" aria-hidden />
            {tr(
              `It can pay bills from up to ${p.retroactive.months_before_application_month} months before you apply, including this visit.`,
              `Puede pagar facturas de hasta ${p.retroactive.months_before_application_month} meses antes de que lo solicite, incluida esta visita.`,
            )}
          </li>
        )}
        <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-violet-700" aria-hidden />{tr("It covers doctors' bills too, not just the hospital.", "También cubre las facturas de los médicos, no solo las del hospital.")}</li>
        <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-violet-700" aria-hidden />{tr("It's health coverage going forward, so future visits are covered.", "Es cobertura médica de aquí en adelante, así que sus próximas visitas también están cubiertas.")}</li>
      </ul>
      {m.applyBy && (
        <p className="mt-4 rounded-xl bg-white p-3 text-sm font-semibold text-violet-900">
          {tr(
            `Apply by ${fmtDate(m.applyBy, lang)} so Medicaid can cover your ${fmtDate(covered[0]?.serviceDate ?? m.applyBy, lang)} visit.`,
            `Solicítelo antes del ${fmtDate(m.applyBy, lang)} para que Medicaid pueda cubrir su visita del ${fmtDate(covered[0]?.serviceDate ?? m.applyBy, lang)}.`,
          )}
          <span className="mt-2 block font-normal">
            <CalendarButton
              date={m.applyBy}
              title={tr("Apply for Maryland Medicaid", "Solicitar Medicaid de Maryland")}
              details={tr(
                "Apply at marylandhealthconnection.gov or call 1-855-642-8572 so Medicaid can cover your hospital visit.",
                "Solicítelo en marylandhealthconnection.gov o llame al 1-855-642-8572 para que Medicaid pueda cubrir su visita al hospital.",
              )}
            />
          </span>
        </p>
      )}
      {m.childrenMayQualify && (
        <p className="mt-3 text-sm text-slate-700">{tr("Your children under 19 may also qualify for free or low-cost coverage through MCHP.", "Sus hijos menores de 19 años también podrían calificar para cobertura gratuita o de bajo costo a través de MCHP.")}</p>
      )}
      <div className="mt-4 flex flex-col gap-2">
        <a href={p.apply.url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 font-semibold text-white">
          {tr("Apply at Maryland Health Connection", "Solicitar en Maryland Health Connection")} <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
        <a href={`tel:${p.apply.phone}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-300 bg-white px-4 py-3 font-semibold text-violet-900">
          <Phone className="h-4 w-4" aria-hidden /> {tr("Call", "Llamar al")} {p.apply.phone}
        </a>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        <Auto>{p.apply.hours}</Auto>.{" "}
        {tr(
          "Your counselor can help you apply. This doesn't check citizenship or immigration status or work rules; the state decides. Financial assistance below still applies either way.",
          "Su consejero puede ayudarle a solicitarlo. Esto no revisa ciudadanía, estatus migratorio ni requisitos de trabajo; el estado decide. La asistencia financiera de abajo aplica de todos modos.",
        )}
      </p>
    </section>
  );
}

export default function Results({ policy, primaryBills, groups, policies, state, next, back }: StepProps) {
  const { tr } = useLang();
  const r = screen(policy, primaryBills, state.answers, state.docs, state.medicaidStatus, { medicaid: medicaidProgram, patientAge: ageFromDob(state.patient.dob) });
  const byId = Object.fromEntries(primaryBills.map((b) => [b.id, b]));
  const others = groups.filter((g) => g.hospitalId !== policy.id);
  const estimated = primaryBills.filter((b) => r.estimatedOwed[b.id] != null);
  const before = estimated.reduce((s, b) => s + b.amountOwed, 0);
  const after = estimated.reduce((s, b) => s + (r.estimatedOwed[b.id] ?? 0), 0);
  const separate = r.coverage.filter((c) => c.status === "separate_program");
  const stillNeeded = r.readiness.missing.filter((m) => !m.toLowerCase().includes("signature"));
  // Signatures come on the last screen, so they shouldn't read as "missing" here.
  const onlySignatures = !stillNeeded.length && r.readiness.status === "missing_info";
  const source = (
    <>
      {tr("From the", "Según la")} <a className="underline" href={policy.policy.url} target="_blank" rel="noreferrer">{policy.policy.title}</a> ({tr("revised", "revisada")} {policy.policy.revision})
    </>
  );

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">{tr("Here's where you stand", "Esta es su situación")}</h1>

      {estimated.length > 0 ? (
        <div className="rounded-3xl bg-gradient-to-br from-teal-700 to-teal-900 p-6 text-white">
          <p className="text-sm text-teal-100">{tr("You may owe about", "Podría deber unos")}</p>
          <p className="mt-1 text-5xl font-bold tabular-nums">{money(after)}</p>
          <p className="mt-1 text-teal-100">{tr("instead of", "en lugar de")} <s>{money(before)}</s></p>
          <div className="mt-5 flex flex-col gap-2" aria-hidden>
            <div className="h-3 w-full rounded-full bg-white/25" />
            <div className="h-3 rounded-full bg-white" style={{ width: `${Math.max(2, (after / before) * 100)}%` }} />
          </div>
          <p className="mt-4 text-xs text-teal-100">{tr("An estimate from the hospital's published rules. A financial counselor makes the final decision.", "Un cálculo basado en las reglas publicadas del hospital. Un consejero financiero toma la decisión final.")}</p>
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="font-semibold text-slate-900">{tr("A counselor will look at your situation", "Un consejero revisará su situación")}</p>
          <p className="mt-1 text-sm text-slate-600"><Auto>{r.eligibility.reason}</Auto></p>
        </div>
      )}

      {r.medicaid && (r.medicaid.status === "likely" || r.medicaid.status === "possible") && <MedicaidCard m={r.medicaid} bills={primaryBills} />}

      {others.map((g) => {
        const total = g.bills.reduce((sum, b) => sum + b.amountOwed, 0);
        const phone = g.bills.map((b) => state.resolutions?.[b.id]?.billerPhone ?? b.billerPhone).find(Boolean);
        if (g.status === "live" && g.hospitalId && policies[g.hospitalId]) {
          const o = screen(policies[g.hospitalId], g.bills, state.answers, state.docs, state.medicaidStatus);
          const owed = g.bills.reduce((sum, b) => sum + (o.estimatedOwed[b.id] ?? b.amountOwed), 0);
          return (
            <div key={g.key} className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
              <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
              <div>
                <p className="font-semibold">{g.hospitalName}: {tr("about", "unos")} {money(owed)} {tr("instead of", "en lugar de")} {money(total)}</p>
                <p className="mt-1">
                  <Auto>{o.eligibility.reason}</Auto>{" "}
                  {tr(`This is under ${g.hospitalName}'s own policy, and we'll send them a separate application.`, `Esto es bajo la póliza propia de ${g.hospitalName}, y les enviaremos una solicitud aparte.`)}
                </p>
              </div>
            </div>
          );
        }
        return (
          <div key={g.key} className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <Hourglass className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
            <div>
              {g.status === "pending" ? (
                <>
                  <p className="font-semibold">{tr(`We're adding ${g.hospitalName}'s assistance policy`, `Estamos agregando la póliza de asistencia de ${g.hospitalName}`)}</p>
                  <p className="mt-1">
                    {tr(
                      `We found their published policy and a reviewer is checking it. Once it's approved, you can come back and add your ${money(total)} bill. Until then, you can call them about financial assistance.`,
                      `Encontramos su póliza publicada y un revisor la está verificando. Cuando se apruebe, puede volver y agregar su factura de ${money(total)}. Mientras tanto, puede llamarles para preguntar por asistencia financiera.`,
                    )}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold">{tr(`We can't screen your ${money(total)} bill from ${g.hospitalName} yet`, `Todavía no podemos evaluar su factura de ${money(total)} de ${g.hospitalName}`)}</p>
                  <p className="mt-1">
                    {tr(
                      "It doesn't look like a hospital we can check. Ask them directly whether they offer financial assistance or a payment plan.",
                      "No parece ser un hospital que podamos revisar. Pregúnteles directamente si ofrecen asistencia financiera o un plan de pagos.",
                    )}
                  </p>
                </>
              )}
              {phone && <p className="mt-1">{tr("Their number from your bill:", "Su número según la factura:")} <a className="font-semibold underline" href={`tel:${phone}`}>{phone}</a></p>}
            </div>
          </div>
        );
      })}

      {separate.map((c) => (
        <div key={c.billId} className="flex gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
          <Phone className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" aria-hidden />
          <div>
            <p className="font-semibold">
              {tr(`Your ${money(byId[c.billId]?.amountOwed ?? 0)} bill from ${c.matchedName} needs a separate step`, `Su factura de ${money(byId[c.billId]?.amountOwed ?? 0)} de ${c.matchedName} necesita un paso aparte`)}
            </p>
            <p className="mt-1">
              {tr("Doctors bill separately from the hospital and have their own assistance program. Call", "Los médicos facturan aparte del hospital y tienen su propio programa de asistencia. Llame al")}{" "}
              <a className="font-semibold underline" href={`tel:${c.contactPhone}`}>{c.contactPhone}</a> {tr("and ask about financial assistance.", "y pregunte por asistencia financiera.")}
            </p>
          </div>
        </div>
      ))}

      <StatusCard
        n={1}
        question={tr("Which bills does this program cover?", "¿Qué facturas cubre este programa?")}
        tone={r.coverage.every((c) => c.status === "covered") ? "good" : "info"}
        badge={tr(`${r.coverage.filter((c) => c.status === "covered").length} of ${r.coverage.length} covered`, `${r.coverage.filter((c) => c.status === "covered").length} de ${r.coverage.length} cubiertas`)}
        why={<ul className="flex flex-col gap-2">{r.coverage.map((c) => <li key={c.billId}><Auto>{c.reason}</Auto></li>)}</ul>}
      >
        <ul className="flex flex-col gap-2">
          {r.coverage.map((c) => (
            <li key={c.billId} className="flex items-center justify-between gap-3">
              <span>{byId[c.billId]?.billerName} · {money(byId[c.billId]?.amountOwed ?? 0)}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${tones[coverageLabel[c.status].tone].badge}`}>{tr(coverageLabel[c.status].text, coverageLabel[c.status].es)}</span>
            </li>
          ))}
        </ul>
      </StatusCard>

      <StatusCard
        n={2}
        question={tr("Does your household appear to qualify?", "¿Parece que su hogar califica?")}
        tone={eligibilityLabel[r.eligibility.status].tone}
        badge={r.eligibility.discountPct === 100 ? tr("Free care", "Atención gratuita") : r.eligibility.discountPct > 0 ? tr(`${r.eligibility.discountPct}% discount`, `${r.eligibility.discountPct}% de descuento`) : tr(eligibilityLabel[r.eligibility.status].text, eligibilityLabel[r.eligibility.status].es)}
        why={<><p><Auto>{r.eligibility.reason}</Auto></p><p className="mt-2 text-xs">{source}, {r.eligibility.source}.</p></>}
      >
        {r.eligibility.status === "presumptive" ? (
          tr("Because you receive a qualifying public benefit, you may not need to prove your income.", "Como recibe un beneficio público que califica, quizás no necesite comprobar sus ingresos.")
        ) : r.eligibility.status === "potentially_eligible" ? (
          tr(
            `Based on a household of ${state.answers.householdSize} with $${state.answers.annualIncome.toLocaleString()} a year.`,
            `Según un hogar de ${state.answers.householdSize} con $${state.answers.annualIncome.toLocaleString()} al año.`,
          )
        ) : (
          <Auto>{r.eligibility.reason}</Auto>
        )}
      </StatusCard>

      <StatusCard
        n={3}
        question={tr("Is your application ready?", "¿Está lista su solicitud?")}
        tone={stillNeeded.length ? "warn" : onlySignatures ? "good" : readinessLabel[r.readiness.status].tone}
        badge={stillNeeded.length ? tr(`${stillNeeded.length} thing${stillNeeded.length > 1 ? "s" : ""} to add`, `${stillNeeded.length} cosa${stillNeeded.length > 1 ? "s" : ""} por agregar`) : onlySignatures ? tr("Just sign at the end", "Solo falta firmar al final") : tr(readinessLabel[r.readiness.status].text, readinessLabel[r.readiness.status].es)}
        why={r.readiness.flags.length ? <ul className="flex flex-col gap-1">{r.readiness.flags.map((f) => <li key={f}><Auto>{f}</Auto></li>)}</ul> : undefined}
      >
        {stillNeeded.length ? (
          <ul className="flex flex-col gap-1">{stillNeeded.map((m) => <li key={m}>• <Auto>{m}</Auto></li>)}</ul>
        ) : (
          <p>{tr("No documents missing.", "No falta ningún documento.")}</p>
        )}
        <p className="mt-2 text-slate-500">{tr("Don't have something? The next screen shows what else is accepted. You'll sign at the end.", "¿Le falta algo? La siguiente pantalla muestra qué más se acepta. Firmará al final.")}</p>
      </StatusCard>

      <Nav next={next} back={back} nextLabel={tr("Get my documents ready", "Preparar mis documentos")} />
    </>
  );
}
