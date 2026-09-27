import { randomBytes } from "node:crypto";
import { hashToken, newAccessToken, unauthorized } from "@/lib/access";
import { getCounselor } from "@/lib/auth";
import { getPolicy } from "@/lib/policies";
import { ageFromDob, medicaidProgram } from "@/lib/programs";
import { screen } from "@/lib/rules";
import { insertApplications, listApplications, type Application } from "@/lib/store";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const counselor = await getCounselor();
  if (!counselor) return unauthorized();
  return Response.json(await listApplications(await createClient(), counselor.hospitalId));
}

export async function POST(request: Request) {
  const body = await request.json();
  const loaded = await getPolicy(body.hospitalId);
  if (!loaded) return Response.json({ error: "Unknown hospital" }, { status: 404 });
  const { policy, policyId } = loaded;

  // Re-screen on the server so the counselor sees results from the rules engine, not whatever the client sent.
  const screening = screen(policy, body.bills, body.answers, body.docs, body.medicaidStatus, { medicaid: medicaidProgram, patientAge: ageFromDob(body.patient?.dob ?? "") });
  const now = new Date().toISOString();
  const app: Application = {
    id: randomBytes(6).toString("hex"),
    hospitalId: policy.id,
    patient: body.patient,
    bills: body.bills,
    answers: body.answers,
    docs: body.docs,
    medicaidStatus: screening.medicaidScreening,
    screening,
    status: "submitted",
    messages: [],
    requests: [],
    events: [{ type: "submitted", at: now, missingCount: screening.readiness.missing.length }],
    submittedAt: now,
    updatedAt: now,
  };

  // Patients are anonymous, so the insert uses the secret key; only a hash of their private key is stored.
  const accessToken = newAccessToken();
  await insertApplications(createAdminClient(), [app], hashToken(accessToken), policyId);
  return Response.json({ id: app.id, accessToken }, { status: 201 });
}
