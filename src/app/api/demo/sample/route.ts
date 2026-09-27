import { getPolicy } from "@/lib/policies";
import { buildSampleApplications } from "@/lib/sample-data";
import { deleteSampleApplications, saveApplication } from "@/lib/store";

export async function POST() {
  deleteSampleApplications();
  const apps = buildSampleApplications(getPolicy("umms")!);
  apps.forEach(saveApplication);
  return Response.json({ added: apps.length });
}

export async function DELETE() {
  deleteSampleApplications();
  return Response.json({ ok: true });
}
