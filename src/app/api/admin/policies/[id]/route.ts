import { unauthorized } from "@/lib/access";
import { isAdmin } from "@/lib/admin";
import { fplFor } from "@/lib/importer/build";
import { clearPolicyCache } from "@/lib/policies";
import { medicaidProgram } from "@/lib/programs";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Policy } from "@/lib/types";

type Body = { action: "approve" } | { action: "reject" } | { action: "save_bands"; bands: { maxPct: number; discount: number }[] };

// Admin-only; all writes go through the admin's own session, so row-level security applies too.
export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/policies/[id]">) {
  if (!(await isAdmin())) return unauthorized();
  const { id } = await ctx.params;
  const db = await createClient();
  const { data: row } = await db.from("policies").select("id, hospital_id, status, data, validation").eq("id", id).maybeSingle();
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  if (row.status !== "draft") return Response.json({ error: `This version is already ${row.status}` }, { status: 409 });
  const body = (await request.json()) as Body;
  const policy = row.data as Policy;

  if (body.action === "save_bands") {
    const bands = body.bands;
    const ok = bands.length > 0 && bands.every((b, i) => b.discount >= 0 && b.discount <= 100 && (i === 0 || (b.maxPct > bands[i - 1].maxPct && b.discount <= bands[i - 1].discount)));
    if (!ok) return Response.json({ error: "Bands must increase in income and decrease in discount, with discounts from 0 to 100." }, { status: 400 });
    const by_household_size = Object.fromEntries(
      Object.keys(policy.income_rules.by_household_size).map((size) => {
        const base = fplFor(medicaidProgram.fpl_2026, Number(size));
        return [size, { fpl_2025: base, mdh_limit_2025: base, band_upper_bounds: bands.map((b) => Math.round((base * b.maxPct) / 100)) }];
      }),
    );
    const data: Policy = { ...policy, income_rules: { ...policy.income_rules, bands_pct_of_mdh: bands.map((b) => b.maxPct), band_discounts_pct: bands.map((b) => b.discount), by_household_size } };
    const { error } = await db.from("policies").update({ data }).eq("id", id);
    return error ? Response.json({ error: error.message }, { status: 500 }) : Response.json({ ok: true });
  }

  const { data: user } = await db.auth.getClaims();
  if (body.action === "approve") {
    const hasErrors = ((row.validation as { checks?: { severity: string }[] }).checks ?? []).some((c) => c.severity === "error");
    if (hasErrors) return Response.json({ error: "This draft has validation errors." }, { status: 400 });
    await db.from("policies").update({ status: "superseded" }).eq("hospital_id", row.hospital_id).eq("status", "approved");
    const { error } = await db.from("policies").update({ status: "approved", approved_by: user?.claims?.sub, approved_at: new Date().toISOString() }).eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    const aliases = [...new Set(policy.facilities.flatMap((f) => [f.name, ...f.aliases]))];
    const { data: h } = await db.from("hospitals").select("aliases").eq("id", row.hospital_id).single();
    await db.from("hospitals").update({ status: "live", aliases: [...new Set([...(h?.aliases ?? []), ...aliases])] }).eq("id", row.hospital_id);
  } else {
    await db.from("policies").update({ status: "rejected" }).eq("id", id);
  }
  // Import jobs are only writable with the server key (admins can read them, not edit them).
  await createAdminClient().from("policy_imports").update({ status: body.action === "approve" ? "approved" : "failed", error: body.action === "reject" ? "Rejected by reviewer" : null }).eq("policy_id", id);
  clearPolicyCache(row.hospital_id);
  return Response.json({ ok: true });
}
