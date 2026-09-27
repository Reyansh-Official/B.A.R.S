// Loads the verified policy files in policies/*.json into Supabase as approved, versioned policies.
// Usage: npm run seed-policies
import { createClient } from "@supabase/supabase-js";
import { readdirSync, readFileSync } from "node:fs";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

for (const file of readdirSync("policies").filter((f) => f.endsWith(".json"))) {
  const policy = JSON.parse(readFileSync(`policies/${file}`, "utf8"));
  const aliases = [...new Set(policy.facilities.flatMap((f) => [f.name, ...f.aliases]))];
  const { error: hErr } = await admin.from("hospitals").upsert({
    id: policy.id,
    name: policy.name,
    aliases,
    state: "MD",
    website: policy.policy.overview_url,
    assistance_phone: policy.contact.phone,
    status: "live",
  });
  if (hErr) throw hErr;

  const { data: current } = await admin.from("policies").select("id, version, data").eq("hospital_id", policy.id).eq("status", "approved").maybeSingle();
  if (current && JSON.stringify(current.data) === JSON.stringify(policy)) {
    console.log(`${policy.id}: already up to date (v${current.version})`);
    continue;
  }
  if (current) await admin.from("policies").update({ status: "superseded" }).eq("id", current.id);
  const sources = [
    { kind: "policy", url: policy.policy.url },
    { kind: "sliding_scale", url: policy.policy.sliding_scale_url },
    { kind: "application", url: policy.policy.application_url },
    { kind: "provider_list", url: policy.provider_lists_url },
  ];
  const { error: pErr } = await admin.from("policies").insert({
    hospital_id: policy.id,
    version: (current?.version ?? 0) + 1,
    status: "approved",
    data: policy,
    sources,
    validation: { note: "Hand-verified against the source PDFs (docs/policy-research.md)" },
    approved_at: new Date().toISOString(),
  });
  if (pErr) throw pErr;
  console.log(`${policy.id}: loaded as v${(current?.version ?? 0) + 1}`);
}
