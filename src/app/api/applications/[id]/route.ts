import { getApplication } from "@/lib/store";

export async function GET(_request: Request, ctx: RouteContext<"/api/applications/[id]">) {
  const { id } = await ctx.params;
  const app = getApplication(id);
  if (!app) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(app);
}
