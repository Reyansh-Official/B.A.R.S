import { after } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { unauthorized } from "@/lib/access";
import { getCounselor } from "@/lib/auth";
import { runImport } from "@/lib/importer/run";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 300;

const isServerKey = (header: string | null) => {
  const a = Buffer.from(header ?? "");
  const b = Buffer.from(`Bearer ${process.env.SUPABASE_SECRET_KEY ?? ""}`);
  return Boolean(process.env.SUPABASE_SECRET_KEY) && a.length === b.length && timingSafeEqual(a, b);
};

// Restart an import: admins from the review screen, or the retry script with the server key.
export async function POST(request: Request, ctx: RouteContext<"/api/imports/[id]/run">) {
  let allowed = isServerKey(request.headers.get("authorization"));
  if (!allowed && (await getCounselor())) {
    const { data } = await (await createClient()).rpc("is_admin");
    allowed = data === true;
  }
  if (!allowed) return unauthorized();
  const { id } = await ctx.params;
  after(() => runImport(id));
  return Response.json({ started: id });
}
