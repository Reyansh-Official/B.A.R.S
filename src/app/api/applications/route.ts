import { getPolicy } from "@/lib/policies";
import { ageFromDob, medicaidProgram } from "@/lib/programs";
import { screen } from "@/lib/rules";
import { listApplications, saveApplication, type Application } from "@/lib/store";

export async function GET() {
  return Response.json(listApplications());
}

export async function POST(request: Request) {
  const body = await request.json();
  const policy = getPolicy(body.hospitalId);
  if (!policy) return Response.json({ error: "Unknown hospital" }, { status: 404 });

  // Re-screen on the server so the counselor sees results from the rules engine, not whatever the client sent.
  const screening = screen(policy, body.bills, body.answers, body.docs, body.medicaidStatus, { medicaid: medicaidProgram, patientAge: ageFromDob(body.patient?.dob ?? "") });
  const app: Application = {
    id: crypto.randomUUID().slice(0, 8),
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
    events: [{ type: "submitted", at: new Date().toISOString(), missingCount: screening.readiness.missing.length }],
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return Response.json(saveApplication(app), { status: 201 });
}
