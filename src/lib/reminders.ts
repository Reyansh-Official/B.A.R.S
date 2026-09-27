import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { decrypt, encrypt } from "./crypto";
import { getPolicy } from "./policies";
import { dueReminders, toE164 } from "./reminder-rules";
import { getApplication, type Application } from "./store";
import { createAdminClient } from "./supabase/admin";

export const CONSENT_TEXT =
  "Text me reminders about this application and its deadlines. About 1–6 messages per application. Msg & data rates may apply. Reply STOP to opt out.";

const twilioReady = () => Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
export const smsMode = () => (twilioReady() ? "twilio" : process.env.SMS_PROVIDER === "messages" ? "messages" : "outbox");

// Demo sender for a Mac: the Messages app texts from the signed-in Apple ID (SMS via iPhone relay, else iMessage).
const MESSAGES_SCRIPT = `on run argv
  tell application "Messages"
    try
      set acct to first account whose service type = SMS and enabled is true
    on error
      set acct to first account whose service type = iMessage and enabled is true
    end try
    send (item 2 of argv) to participant (item 1 of argv) of acct
  end tell
end run`;

type SendResult = { status: "sent" | "logged" | "failed"; providerId?: string; error?: string; optedOut?: boolean };

async function sendViaMessages(to: string, body: string): Promise<SendResult> {
  try {
    await promisify(execFile)("osascript", ["-e", MESSAGES_SCRIPT, to, body], { timeout: 20_000 });
    return { status: "sent", providerId: "messages" };
  } catch (e) {
    return { status: "failed", error: `Messages: ${(e as { stderr?: string }).stderr?.trim() || (e as Error).message}` };
  }
}

// Twilio REST: one form POST. With no provider configured, messages are only logged to the admin Outbox.
export async function sendSms(to: string, body: string): Promise<SendResult> {
  const mode = smsMode();
  if (mode === "outbox") return { status: "logged" };
  if (mode === "messages") return sendViaMessages(to, body);
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}` },
    body: new URLSearchParams({ To: to, From: process.env.TWILIO_FROM_NUMBER!, Body: body }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok) return { status: "sent", providerId: data.sid };
  return { status: "failed", error: `${data.code ?? res.status}: ${data.message ?? "Twilio error"}`, optedOut: data.code === 21610 };
}

export async function optIn(app: Application, rawPhone: string, link: string) {
  const phone = toE164(rawPhone);
  if (!phone) return;
  const db = createAdminClient();
  const { error } = await db.from("reminder_contacts").upsert({
    application_id: app.id,
    phone_encrypted: encrypt(phone),
    phone_last4: phone.slice(-4),
    link_encrypted: encrypt(link),
    consent_text: CONSENT_TEXT,
  });
  if (error) throw new Error(`Database error: ${error.message}`);
  await sendDue(app);
}

// Sends every reminder that's due and not yet in the outbox. The unique dedupe key makes this safe to rerun.
export async function sendDue(app: Application, now = new Date()) {
  const db = createAdminClient();
  const { data: contact } = await db.from("reminder_contacts").select("*").eq("application_id", app.id).maybeSingle();
  if (!contact || contact.opted_out_at) return 0;
  const hospital = (await getPolicy(app.hospitalId))?.policy.name ?? "the hospital";
  const link = decrypt(contact.link_encrypted);
  const due = dueReminders(app, hospital, link, now);
  if (!due.length) return 0;

  const { data: done } = await db.from("outbox_messages").select("dedupe_key").in("dedupe_key", due.map((d) => d.key));
  const sentKeys = new Set((done ?? []).map((d) => d.dedupe_key));
  let count = 0;
  for (const r of due.filter((d) => !sentKeys.has(d.key))) {
    // Claim the key first (the stored copy hides the private link) so two concurrent runs can't both text the patient.
    const { data: row, error } = await db
      .from("outbox_messages")
      .insert({ application_id: app.id, dedupe_key: r.key, kind: r.kind, to_last4: contact.phone_last4, body: r.body.replace(link, "[status link]"), status: "queued" })
      .select("id")
      .single();
    if (error) continue;
    const result = await sendSms(decrypt(contact.phone_encrypted), r.body);
    await db.from("outbox_messages").update({ status: result.status, provider_id: result.providerId ?? null, error: result.error ?? null, sent_at: new Date().toISOString() }).eq("id", row.id);
    if (result.optedOut) {
      await db.from("reminder_contacts").update({ opted_out_at: new Date().toISOString() }).eq("application_id", app.id);
      break;
    }
    count++;
  }
  return count;
}

export async function sendDueFor(id: string) {
  const found = await getApplication(createAdminClient(), id);
  return found ? sendDue(found.app) : 0;
}

// The daily sweep: every opted-in application.
export async function runReminders(now = new Date()) {
  const db = createAdminClient();
  const { data, error } = await db.from("reminder_contacts").select("application_id").is("opted_out_at", null);
  if (error) throw new Error(`Database error: ${error.message}`);
  let sent = 0;
  for (const { application_id } of data ?? []) {
    const found = await getApplication(db, application_id);
    if (found) sent += await sendDue(found.app, now);
  }
  return { applications: data?.length ?? 0, sent };
}

