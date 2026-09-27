import { getPolicy } from "@/lib/policies";
import { screen } from "@/lib/rules";
import { getApplication, saveApplication, type Application } from "@/lib/store";
import type { DocState, MedicaidScreening } from "@/lib/types";

// Prototype: no auth. A real deployment needs patient links with a secret token and counselor sign-in.
type Action =
  | { action: "request_info"; docIds: string[]; message: string }
  | { action: "respond"; docs: Record<string, DocState>; message?: string }
  | { action: "set_medicaid"; status: MedicaidScreening }
  | { action: "mark_in_review" };

export async function GET(_request: Request, ctx: RouteContext<"/api/applications/[id]">) {
  const { id } = await ctx.params;
  const app = getApplication(id);
  if (!app) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(app);
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/applications/[id]">) {
  const { id } = await ctx.params;
  const app = getApplication(id);
  if (!app) return Response.json({ error: "Not found" }, { status: 404 });
  const policy = getPolicy(app.hospitalId)!;
  const body = (await request.json()) as Action;
  const now = new Date();
  const next: Application = { ...app, requests: app.requests ?? [], updatedAt: now.toISOString() };

  switch (body.action) {
    case "request_info": {
      if (!body.docIds.length && !body.message.trim()) {
        return Response.json({ error: "Choose a document or write a message." }, { status: 400 });
      }
      const due = new Date(now.getTime() + policy.timelines.missing_info_response_days * 86_400_000);
      next.requests = [...next.requests, { docIds: body.docIds, message: body.message, at: now.toISOString(), dueBy: due.toISOString() }];
      if (body.message.trim()) next.messages = [...app.messages, { from: "counselor", text: body.message.trim(), at: now.toISOString() }];
      next.status = "info_requested";
      break;
    }
    case "respond": {
      next.docs = { ...app.docs, ...body.docs };
      if (body.message?.trim()) next.messages = [...app.messages, { from: "patient", text: body.message.trim(), at: now.toISOString() }];
      next.requests = next.requests.map((r) => (r.resolvedAt ? r : { ...r, resolvedAt: now.toISOString() }));
      next.status = "responded";
      break;
    }
    case "set_medicaid":
      next.medicaidStatus = body.status;
      break;
    case "mark_in_review":
      next.status = "in_review";
      break;
    default:
      return Response.json({ error: "Unknown action" }, { status: 400 });
  }

  next.screening = screen(policy, next.bills, next.answers, next.docs, next.medicaidStatus);
  return Response.json(saveApplication(next));
}
