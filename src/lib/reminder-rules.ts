import type { Application } from "./store.ts";

export interface DueReminder {
  key: string;
  kind: "welcome" | "info_request" | "info_request_7d" | "info_request_2d" | "in_review" | "medicaid_7d" | "medicaid_2d";
  body: string;
}

const DAY = 86_400_000;

// Pure: which reminders are due for one application right now. Each key is sent at most once (outbox dedupe),
// so this can run as often as we like.
export function dueReminders(
  app: Pick<Application, "id" | "status" | "requests" | "screening" | "medicaidStatus" | "lang">,
  hospitalName: string,
  link: string,
  now: Date,
): DueReminder[] {
  const out: DueReminder[] = [];
  const t = now.getTime();
  const es = app.lang === "es";
  const say = (en: string, spanish: string) => (es ? spanish : en);
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(es ? "es-US" : "en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const stop = say("Reply STOP to opt out.", "Responda STOP para cancelar.");
  const medicaidWhere = say("at marylandhealthconnection.gov or 1-855-642-8572", "en marylandhealthconnection.gov o al 1-855-642-8572");

  out.push({
    key: `${app.id}:welcome`,
    kind: "welcome",
    body: say(
      `B.A.R.S.: You're signed up for reminders about your ${hospitalName} financial assistance application. Check status: ${link} ${stop}`,
      `B.A.R.S.: Se inscribió para recibir recordatorios sobre su solicitud de asistencia financiera de ${hospitalName}. Vea el estado: ${link} ${stop}`,
    ),
  });

  for (const r of app.requests ?? []) {
    if (r.resolvedAt) continue;
    const due = new Date(r.dueBy).getTime();
    if (t >= due) continue;
    const d = fmt(r.dueBy);
    // Only the most urgent stage: a late sweep sends one text, not a burst.
    if (t >= due - 2 * DAY) out.push({ key: `${app.id}:req:${r.at}:2d`, kind: "info_request_2d", body: say(`B.A.R.S.: 2 days left to send ${hospitalName} the information they asked for (due ${d}). ${link}`, `B.A.R.S.: Quedan 2 días para enviar a ${hospitalName} la información que pidió (vence el ${d}). ${link}`) });
    else if (t >= due - 7 * DAY) out.push({ key: `${app.id}:req:${r.at}:7d`, kind: "info_request_7d", body: say(`B.A.R.S.: Reminder, ${hospitalName} still needs information from you by ${d}. It only takes a few minutes: ${link}`, `B.A.R.S.: Recordatorio: ${hospitalName} todavía necesita información suya antes del ${d}. Solo toma unos minutos: ${link}`) });
    else out.push({ key: `${app.id}:req:${r.at}:new`, kind: "info_request", body: say(`B.A.R.S.: ${hospitalName} needs more information for your application. Please respond by ${d}: ${link}`, `B.A.R.S.: ${hospitalName} necesita más información para su solicitud. Responda antes del ${d}: ${link}`) });
  }

  if (app.status === "in_review") {
    out.push({ key: `${app.id}:in_review`, kind: "in_review", body: say(`B.A.R.S.: Good news, your ${hospitalName} application is complete and being reviewed. Check status: ${link}`, `B.A.R.S.: Buenas noticias: su solicitud de ${hospitalName} está completa y en revisión. Vea el estado: ${link}`) });
  }

  const m = app.screening.medicaid;
  if (m?.applyBy && (m.status === "likely" || m.status === "possible") && app.medicaidStatus === "unknown") {
    const due = new Date(`${m.applyBy}T23:59:59Z`).getTime();
    const d = fmt(m.applyBy);
    if (t < due && t >= due - 2 * DAY) out.push({ key: `${app.id}:medicaid:${m.applyBy}:2d`, kind: "medicaid_2d", body: say(`B.A.R.S.: 2 days left to apply for Maryland Medicaid so it can cover your visit (by ${d}). Apply ${medicaidWhere}.`, `B.A.R.S.: Quedan 2 días para solicitar Medicaid de Maryland y que cubra su visita (antes del ${d}). Solicítelo ${medicaidWhere}.`) });
    else if (t < due && t >= due - 7 * DAY) out.push({ key: `${app.id}:medicaid:${m.applyBy}:7d`, kind: "medicaid_7d", body: say(`B.A.R.S.: You may qualify for Maryland Medicaid, which could cover this visit. Apply by ${d} ${medicaidWhere}.`, `B.A.R.S.: Podría calificar para Medicaid de Maryland, que podría cubrir esta visita. Solicítelo antes del ${d} ${medicaidWhere}.`) });
  }
  return out;
}

// US numbers: accepts (410) 555-0142, 410-555-0142, +1 410 555 0142. Returns E.164 or null.
export function toE164(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}
