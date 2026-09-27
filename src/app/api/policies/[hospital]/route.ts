import { getPolicy } from "@/lib/policies";

// Approved policies are public information; the patient flow loads them when a bill comes from another hospital.
export async function GET(_request: Request, ctx: RouteContext<"/api/policies/[hospital]">) {
  const loaded = await getPolicy((await ctx.params).hospital);
  return loaded ? Response.json(loaded.policy) : Response.json({ error: "No approved policy" }, { status: 404 });
}
