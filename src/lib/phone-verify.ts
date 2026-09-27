import "server-only";
import { randomInt, timingSafeEqual } from "node:crypto";
import { keyedHash } from "./crypto";
import { toE164 } from "./reminder-rules";
import { sendSms, smsMode } from "./reminders";
import { createAdminClient } from "./supabase/admin";

const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const MAX_SENDS = 3; // per phone per 15 minutes
const USE_WITHIN_MINUTES = 60;

type Lang = "en" | "es";
const t = (lang: Lang, en: string, es: string) => (lang === "es" ? es : en);

type Start = { ok: true; id: string; devCode?: string } | { ok: false; error: string };

export async function startVerification(rawPhone: string, lang: Lang = "en"): Promise<Start> {
  const phone = toE164(rawPhone);
  if (!phone) return { ok: false, error: t(lang, "Enter a 10-digit US phone number.", "Escriba un número de EE. UU. de 10 dígitos.") };
  const db = createAdminClient();
  const phoneHash = keyedHash(phone);

  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const { count } = await db.from("phone_verifications").select("id", { count: "exact", head: true }).eq("phone_hash", phoneHash).gte("created_at", since);
  if ((count ?? 0) >= MAX_SENDS) return { ok: false, error: t(lang, "Too many codes sent. Wait 15 minutes and try again.", "Se enviaron demasiados códigos. Espere 15 minutos e intente de nuevo.") };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const { data, error } = await db
    .from("phone_verifications")
    .insert({ phone_hash: phoneHash, code_hash: keyedHash(code), expires_at: new Date(Date.now() + CODE_MINUTES * 60_000).toISOString() })
    .select("id")
    .single();
  if (error) throw new Error(`Database error: ${error.message}`);

  const sent = await sendSms(
    phone,
    t(
      lang,
      `B.A.R.S.: Your verification code is ${code}. It expires in ${CODE_MINUTES} minutes. If you didn't ask for this, ignore it.`,
      `B.A.R.S.: Su código de verificación es ${code}. Vence en ${CODE_MINUTES} minutos. Si usted no lo pidió, ignore este mensaje.`,
    ),
  );
  if (sent.status === "failed") return { ok: false, error: t(lang, "We couldn't text that number. Check it and try again.", "No pudimos enviar un mensaje a ese número. Revíselo e intente de nuevo.") };
  // With no text provider configured, the code can't reach a phone; show it only in demo mode.
  return { ok: true, id: data.id, devCode: smsMode() === "outbox" && process.env.DEMO_MODE === "true" ? code : undefined };
}

export async function checkCode(id: string, code: string, lang: Lang = "en"): Promise<{ ok: boolean; error?: string }> {
  const db = createAdminClient();
  const { data: row } = await db.from("phone_verifications").select("*").eq("id", id).maybeSingle();
  if (!row || row.verified_at) return { ok: false, error: t(lang, "Start over and request a new code.", "Empiece de nuevo y pida un código nuevo.") };
  if (new Date(row.expires_at) < new Date()) return { ok: false, error: t(lang, "That code expired. Request a new one.", "Ese código venció. Pida uno nuevo.") };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: t(lang, "Too many tries. Request a new code.", "Demasiados intentos. Pida un código nuevo.") };

  await db.from("phone_verifications").update({ attempts: row.attempts + 1 }).eq("id", id);
  const given = Buffer.from(keyedHash(code.replace(/\D/g, "")));
  const expected = Buffer.from(row.code_hash);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, error: t(lang, "That code doesn't match.", "Ese código no coincide.") };

  await db.from("phone_verifications").update({ verified_at: new Date().toISOString() }).eq("id", id);
  return { ok: true };
}

// Checked at submission (once per hospital when bills go to several): verified, for this phone, and recent.
export async function isVerified(id: string | undefined, rawPhone: string): Promise<boolean> {
  const phone = toE164(rawPhone);
  if (!id || !phone) return false;
  const { data: row } = await createAdminClient().from("phone_verifications").select("phone_hash, verified_at").eq("id", id).maybeSingle();
  if (!row?.verified_at || row.phone_hash !== keyedHash(phone)) return false;
  return Date.now() - new Date(row.verified_at).getTime() <= USE_WITHIN_MINUTES * 60_000;
}
