import "server-only";
import mdMinimums from "../../../policies/state-minimums/md.json";
import { medicaidProgram } from "../programs";
import { slugify } from "../resolve";
import { createAdminClient } from "../supabase/admin";
import { discoverDocuments, downloadDocuments, extractPolicy, type BillerQuery, type CallUsage } from "./ai";
import type { DiscoveredDocuments } from "./schema";
import { buildPolicy } from "./build";
import { validatePolicy, type StateMinimums } from "./validate";

const stateMinimums: Record<string, StateMinimums> = { MD: mdMinimums as unknown as StateMinimums };

// Creates (or reuses) a pending hospital and an import job for a biller we don't know yet.
export async function queueImport(q: BillerQuery): Promise<{ hospitalId: string; importId: string | null; alreadyKnown: boolean }> {
  const db = createAdminClient();
  const hospitalId = slugify(q.billerName);
  const { data: existing } = await db.from("hospitals").select("id, status").eq("id", hospitalId).maybeSingle();
  if (existing) return { hospitalId, importId: null, alreadyKnown: true };

  await db.from("hospitals").insert({
    id: hospitalId,
    name: q.billerName,
    aliases: [q.billerName],
    state: q.billerState ?? null,
    website: q.billerWebsite ?? null,
    assistance_phone: q.billerPhone ?? null,
    status: "pending",
  });
  const { data: job, error } = await db.from("policy_imports").insert({ hospital_id: hospitalId, query: q, status: "queued" }).select("id").single();
  if (error) throw new Error(error.message);
  return { hospitalId, importId: job.id, alreadyKnown: false };
}

// find -> download -> extract -> validate -> save as a draft for human review. Never publishes on its own.
export async function runImport(importId: string) {
  const db = createAdminClient();
  const { data: job } = await db.from("policy_imports").select("id, hospital_id, query, log, discovered").eq("id", importId).single();
  if (!job) return;
  const hospitalId: string = job.hospital_id;
  const log: { at: string; message: string }[] = job.log ?? [];

  const usage: CallUsage[] = [];
  const cost = () => ({ calls: usage, totalUsd: Math.round(usage.reduce((sum, u) => sum + u.usd, 0) * 100) / 100 });
  const update = (fields: Record<string, unknown>) => db.from("policy_imports").update({ ...fields, log, usage: cost(), updated_at: new Date().toISOString() }).eq("id", importId);
  const note = async (message: string) => {
    log.push({ at: new Date().toISOString(), message });
    await update({});
  };

  try {
    let found = job.discovered as DiscoveredDocuments | null;
    if (found) {
      await note(`Reusing the ${found.documents.length} document link(s) found earlier (no new web search)`);
    } else {
      await update({ status: "searching" });
      await note(`Searching for ${job.query.billerName}'s financial assistance policy`);
      found = await discoverDocuments(job.query as BillerQuery, usage);
      await update({ discovered: found });
    }
    if (!found.found || !found.documents.some((d) => d.kind === "policy")) {
      throw new Error(`No financial assistance policy found. ${found.notes}`);
    }
    await note(`Found ${found.documents.length} document(s) for ${found.officialName}`);
    await db
      .from("hospitals")
      .update({
        name: found.officialName,
        aliases: [...new Set([job.query.billerName, found.officialName, ...found.aliases])],
        state: found.state ?? job.query.billerState ?? null,
        website: found.website,
        assistance_phone: found.assistancePhone ?? job.query.billerPhone ?? null,
      })
      .eq("id", hospitalId);

    await update({ status: "extracting" });
    const docs = await downloadDocuments(found.documents, note);
    if (!docs.some((d) => d.kind === "policy")) throw new Error("Couldn't download the policy document.");
    await note("Reading the policy");
    const extracted = await extractPolicy(docs, usage);

    await update({ status: "validating" });
    const state = (found.state ?? job.query.billerState ?? "").toUpperCase();
    const validation = validatePolicy(extracted, medicaidProgram.fpl_2026, stateMinimums[state]);
    const sources = docs.map((d) => ({ kind: d.kind, url: d.url, title: d.title }));
    const policy = buildPolicy({ hospitalId, extracted, fpl: medicaidProgram.fpl_2026, sources });
    await note(`Validation: ${validation.status} (${validation.checks.filter((c) => c.severity === "error").length} errors, ${validation.checks.filter((c) => c.severity === "warning").length} warnings)`);

    // A new draft replaces any older unapproved drafts, so reviewers only see the latest.
    await db.from("policies").update({ status: "superseded" }).eq("hospital_id", hospitalId).eq("status", "draft");
    const { data: last } = await db.from("policies").select("version").eq("hospital_id", hospitalId).order("version", { ascending: false }).limit(1).maybeSingle();
    const { data: saved, error } = await db
      .from("policies")
      .insert({ hospital_id: hospitalId, version: (last?.version ?? 0) + 1, status: "draft", data: policy, sources, validation: { ...validation, extracted } })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await update({ status: "needs_review", policy_id: saved.id });
    await note(`Draft ready for review. Measured API cost: $${cost().totalUsd.toFixed(2)}`);
  } catch (e) {
    log.push({ at: new Date().toISOString(), message: `Failed: ${(e as Error).message} (API cost so far: $${cost().totalUsd.toFixed(2)})` });
    await update({ status: "failed", error: (e as Error).message });
    await db.from("hospitals").update({ status: "failed" }).eq("id", hospitalId).eq("status", "pending");
  }
}
