import type { SupabaseClient } from "@supabase/supabase-js";
import { tokenMatches, unauthorized } from "@/lib/access";
import { getCounselor } from "@/lib/auth";
import { after } from "next/server";
import { getPolicy } from "@/lib/policies";
import { sendDue } from "@/lib/reminders";
import { ageFromDob, medicaidProgram } from "@/lib/programs";
import { screen } from "@/lib/rules";
import { getApplication, updateApplication, type Application } from "@/lib/store";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { DocState, MedicaidScreening } from "@/lib/types";

type Action =
  | { action: "request_info"; docIds: string[]; message: string }
  | { action: "respond"; docs: Record<string, DocState>; message?: string }
  | { action: "set_medicaid"; status: MedicaidScreening }
  | { action: "mark_in_review" };

// Counselors act through their own session (row-level security limits them to their hospital).
// Patients have no session, so the server checks their private key before using the secret key.
async function load(request: Request, id: string): Promise<{ db: SupabaseClient; app: Application; role: "counselor" | "patient" } | null> {
  if (await getCounselor()) {
    const db = await createClient();
    const found = await getApplication(db, id);
    return found ? { db, app: found.app, role: "counselor" } : null;
  }
  const db = createAdminClient();
  const found = await getApplication(db, id);
  return found && tokenMatches(request, found.accessTokenHash) ? { db, app: found.app, role: "patient" } : null;
}

export async function GET(request: Request, ctx: RouteContext<"/api/applications/[id]">) {
  const loaded = await load(request, (await ctx.params).id);
  return loaded ? Response.json(loaded.app) : unauthorized();
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/applications/[id]">) {
  const loaded = await load(request, (await ctx.params).id);
  if (!loaded) return unauthorized();
  const { db, app, role } = loaded;
  const body = (await request.json()) as Action;
  if (body.action !== "respond" && role !== "counselor") return unauthorized();

  const current = await getPolicy(app.hospitalId);
  if (!current) return Response.json({ error: "No approved policy for this hospital" }, { status: 409 });
  const { policy } = current;
  const now = new Date();
  const next: Application = { ...app, updatedAt: now.toISOString() };

  switch (body.action) {
    case "request_info": {
      if (!body.docIds.length && !body.message.trim()) {
        return Response.json({ error: "Choose a document or write a message." }, { status: 400 });
      }
      const due = new Date(now.getTime() + policy.timelines.missing_info_response_days * 86_400_000);
      next.requests = [...app.requests, { docIds: body.docIds, message: body.message, at: now.toISOString(), dueBy: due.toISOString() }];
      if (body.message.trim()) next.messages = [...app.messages, { from: "counselor", text: body.message.trim(), at: now.toISOString() }];
      next.status = "info_requested";
      next.events = [...app.events, { type: "info_requested", at: now.toISOString() }];
      break;
    }
    case "respond": {
      next.docs = { ...app.docs, ...body.docs };
      if (body.message?.trim()) next.messages = [...app.messages, { from: "patient", text: body.message.trim(), at: now.toISOString() }];
      next.requests = app.requests.map((r) => (r.resolvedAt ? r : { ...r, resolvedAt: now.toISOString() }));
      next.status = "responded";
      next.events = [...app.events, { type: "responded", at: now.toISOString() }];
      break;
    }
    case "set_medicaid":
      next.medicaidStatus = body.status;
      break;
    case "mark_in_review":
      next.status = "in_review";
      next.events = [...app.events, { type: "in_review", at: now.toISOString() }];
      break;
    default:
      return Response.json({ error: "Unknown action" }, { status: 400 });
  }

  next.screening = screen(policy, next.bills, next.answers, next.docs, next.medicaidStatus, { medicaid: medicaidProgram, patientAge: ageFromDob(next.patient.dob) });
  const saved = await updateApplication(db, next);
  if (body.action === "request_info" || body.action === "mark_in_review") after(() => sendDue(saved).then(() => {}, (e) => console.error("Reminder send failed", e)));
  return Response.json(saved);
}
