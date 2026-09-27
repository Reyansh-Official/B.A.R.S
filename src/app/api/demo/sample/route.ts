import { unauthorized } from "@/lib/access";
import { getCounselor } from "@/lib/auth";
import { getPolicy } from "@/lib/policies";
import { medicaidProgram } from "@/lib/programs";
import { buildSampleApplications } from "@/lib/sample-data";
import { deleteSampleApplications, insertApplications } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const counselor = await getCounselor();
  if (!counselor) return unauthorized();
  const db = await createClient();
  await deleteSampleApplications(db, counselor.hospitalId);
  const loaded = await getPolicy(counselor.hospitalId);
  if (!loaded) return Response.json({ error: "No approved policy for this hospital" }, { status: 400 });
  const apps = buildSampleApplications(loaded.policy, 24, new Date(), medicaidProgram);
  await insertApplications(db, apps);
  return Response.json({ added: apps.length });
}

export async function DELETE() {
  const counselor = await getCounselor();
  if (!counselor) return unauthorized();
  await deleteSampleApplications(await createClient(), counselor.hospitalId);
  return Response.json({ ok: true });
}
