// Re-runs a failed import for a hospital. Usage: npm run retry-import -- <hospital-id>
import { createClient } from "@supabase/supabase-js";

const [hospitalId] = process.argv.slice(2);
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const { data: job } = await admin.from("policy_imports").select("id, query").eq("hospital_id", hospitalId).order("created_at", { ascending: false }).limit(1).single();
if (!job) throw new Error(`No import found for ${hospitalId}`);
await admin.from("policy_imports").update({ status: "queued", error: null, log: [], updated_at: new Date().toISOString() }).eq("id", job.id);
await admin.from("hospitals").update({ status: "pending" }).eq("id", hospitalId);
const res = await fetch(`${process.env.CARECLEAR_URL ?? "http://localhost:3100"}/api/imports/${job.id}/run`, {
  method: "POST",
  headers: { authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}` },
});
console.log(`Import ${job.id} restarted: HTTP ${res.status}`);
