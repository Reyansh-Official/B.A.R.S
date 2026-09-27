import type { Application } from "./store.ts";

export interface DueReminder {
  key: string;
  kind: "welcome" | "info_request" | "info_request_7d" | "info_request_2d" | "in_review" | "medicaid_7d" | "medicaid_2d";
  body: string;
}

const DAY = 86_400_000;
const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

// Pure: which reminders are due for one application right now. Each key is sent at most once (outbox dedupe),
// so this can run as often as we like.
export function dueReminders(
  app: Pick<Application, "id" | "status" | "requests" | "screening" | "medicaidStatus">,
  hospitalName: string,
  link: string,
  now: Date,
): DueReminder[] {
  const out: DueReminder[] = [];
  const t = now.getTime();
  const stop = "Reply STOP to opt out.";

  out.push({ key: `${app.id}:welcome`, kind: "welcome", body: `B.A.R.S.: You're signed up for reminders about your ${hospitalName} financial assistance application. Check status: ${link} ${stop}` });

  for (const r of app.requests ?? []) {
    if (r.resolvedAt) continue;
    const due = new Date(r.dueBy).getTime();
    if (t >= due) continue;
    // Only the most urgent stage: a late sweep sends one text, not a burst.
    if (t >= due - 2 * DAY) out.push({ key: `${app.id}:req:${r.at}:2d`, kind: "info_request_2d", body: `B.A.R.S.: 2 days left to send ${hospitalName} the information they asked for (due ${fmt(r.dueBy)}). ${link}` });
    else if (t >= due - 7 * DAY) out.push({ key: `${app.id}:req:${r.at}:7d`, kind: "info_request_7d", body: `B.A.R.S.: Reminder, ${hospitalName} still needs information from you by ${fmt(r.dueBy)}. It only takes a few minutes: ${link}` });
    else out.push({ key: `${app.id}:req:${r.at}:new`, kind: "info_request", body: `B.A.R.S.: ${hospitalName} needs more information for your application. Please respond by ${fmt(r.dueBy)}: ${link}` });
  }

  if (app.status === "in_review") {
    out.push({ key: `${app.id}:in_review`, kind: "in_review", body: `B.A.R.S.: Good news, your ${hospitalName} application is complete and being reviewed. Check status: ${link}` });
  }

  const m = app.screening.medicaid;
  if (m?.applyBy && (m.status === "likely" || m.status === "possible") && app.medicaidStatus === "unknown") {
    const due = new Date(`${m.applyBy}T23:59:59Z`).getTime();
    if (t < due && t >= due - 2 * DAY) out.push({ key: `${app.id}:medicaid:${m.applyBy}:2d`, kind: "medicaid_2d", body: `B.A.R.S.: 2 days left to apply for Maryland Medicaid so it can cover your visit (by ${fmt(m.applyBy)}). marylandhealthconnection.gov or 1-855-642-8572.` });
    else if (t < due && t >= due - 7 * DAY) out.push({ key: `${app.id}:medicaid:${m.applyBy}:7d`, kind: "medicaid_7d", body: `B.A.R.S.: You may qualify for Maryland Medicaid, which could cover this visit. Apply by ${fmt(m.applyBy)} at marylandhealthconnection.gov or 1-855-642-8572.` });
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
