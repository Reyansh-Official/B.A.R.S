import { timingSafeEqual } from "node:crypto";
import { unauthorized } from "@/lib/access";
import { isAdmin } from "@/lib/admin";
import { runReminders } from "@/lib/reminders";

export const maxDuration = 300;

// Called once a day by a scheduler (bearer = BARS_CRON_SECRET) or by an admin from the Outbox page.
export async function POST(request: Request) {
  const secret = process.env.BARS_CRON_SECRET ?? "";
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const cron = secret.length > 0 && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!cron && !(await isAdmin())) return unauthorized();
  return Response.json(await runReminders());
}
