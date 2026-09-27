import { screen } from "./rules.ts";
import type { AppEvent, Application, AppStatus } from "./store";
import type { MedicaidProgram } from "./medicaid.ts";
import type { Answers, Bill, DocState, Policy } from "./types";

// Deterministic so the demo dashboard looks the same every time it's loaded.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const first = ["Ana", "Marcus", "Keisha", "Luis", "Tanya", "Derrick", "Mei", "Samuel", "Rosa", "Andre", "Priya", "Jamal", "Carmen", "Victor", "Lena", "Tyrone", "Grace", "Hector", "Nadia", "Curtis", "Imani", "Paul", "Yolanda", "Kevin"];
const last = ["Brooks", "Diaz", "Nguyen", "Johnson", "Patel", "Coleman", "Reyes", "Ward", "Okafor", "Hughes", "Lopez", "Price"];

export function buildSampleApplications(policy: Policy, count = 24, now = new Date(), medicaid?: MedicaidProgram): Application[] {
  const r = rng(20260926);
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const apps: Application[] = [];

  for (let i = 0; i < count; i++) {
    const householdSize = 1 + Math.floor(r() * 5);
    const limit = policy.income_rules.by_household_size[String(householdSize)].mdh_limit_2025;
    const annualIncome = Math.round((limit * (0.8 + r() * 2.4)) / 100) * 100;
    const employment = pick(["employed", "employed", "employed", "self_employed", "unemployed", "retired"] as const);
    const insured = r() < 0.6;
    const married = householdSize > 1 && r() < 0.5;
    const benefits = r() < 0.08 ? [pick(["snap", "wic", "energy"])] : [];
    const answers: Answers = {
      householdSize, annualIncome, employment, insured, married, benefits,
      hasBenefitIncome: employment === "retired", housing: pick(["rent", "rent", "own", "living_with_family"] as const),
      thirdPartyInjury: false, appliedForMedicaid: false,
    };

    const serviceDate = new Date(now.getTime() - (10 + r() * 40) * 86_400_000).toISOString().slice(0, 10);
    const bills: Bill[] = [
      { id: `s${i}-h`, billerName: "University of Maryland Medical Center", serviceDate, amountOwed: Math.round(800 + r() * 7000) },
    ];
    if (r() < 0.45) bills.push({ id: `s${i}-p`, billerName: "University of Maryland Faculty Physicians, Inc.", serviceDate, amountOwed: Math.round(200 + r() * 1500) });

    // Submission snapshot: most arrive complete thanks to alternatives; some still miss an item.
    const docs: Record<string, DocState> = { signature: { status: "provided" } };
    if (married) docs.spouse_signature = { status: "provided" };
    const incomeDoc = employment === "self_employed" ? "tax_return" : employment === "unemployed" ? "unemployment_proof" : employment === "retired" ? "benefit_income" : "income_proof";
    const roll = r();
    const missingIncome = roll < 0.32;
    if (!missingIncome) {
      docs[incomeDoc] = {
        status: roll < 0.4 && incomeDoc !== "income_proof" ? "alternative" : "provided",
        checks: [{ fileName: "upload.pdf", verdict: r() < 0.12 ? "warn" : "ok", summary: "", details: [] }],
      };
    }
    docs.housing = answers.housing === "living_with_family" ? { status: "alternative", note: "FAF 116" } : r() < 0.1 ? { status: "missing" } : { status: "provided", checks: [{ fileName: "lease.pdf", verdict: "ok", summary: "", details: [] }] };
    if (docs.housing.status === "missing") delete docs.housing;

    const medicaidStatus = insured ? "not_required" : pick(["unknown", "pending", "completed", "completed"] as const);
    let screening = screen(policy, bills, answers, docs, medicaidStatus, { medicaid, today: now });
    const submittedAt = new Date(now.getTime() - (1 + r() * 20) * 86_400_000);
    const events: AppEvent[] = [{ type: "submitted", at: submittedAt.toISOString(), missingCount: screening.readiness.missing.length }];
    const hoursLater = (h: number) => new Date(submittedAt.getTime() + h * 3_600_000).toISOString();

    let status: AppStatus = "submitted";
    const requests: Application["requests"] = [];
    const missingIds = screening.readiness.documents.filter((d) => d.status === "missing").map((d) => d.id);
    if (missingIds.length) {
      const askedAt = 2 + r() * 20;
      requests.push({ docIds: missingIds, message: "", at: hoursLater(askedAt), dueBy: hoursLater(askedAt + 720) });
      events.push({ type: "info_requested", at: hoursLater(askedAt) });
      status = "info_requested";
      if (r() < 0.6) {
        const replied = askedAt + 6 + r() * 60;
        requests[0].resolvedAt = hoursLater(replied);
        events.push({ type: "responded", at: hoursLater(replied) });
        for (const id of missingIds) docs[id] = { status: "provided" };
        screening = screen(policy, bills, answers, docs, medicaidStatus, { medicaid, today: now });
        status = "responded";
        if (r() < 0.7) {
          events.push({ type: "in_review", at: hoursLater(replied + 1 + r() * 20) });
          status = "in_review";
        }
      }
    } else if (r() < 0.75) {
      events.push({ type: "in_review", at: hoursLater(1 + r() * 24) });
      status = "in_review";
    }

    apps.push({
      id: `sample${String(i).padStart(2, "0")}`,
      hospitalId: policy.id,
      patient: { name: `${pick(first)} ${pick(last)}`, dob: "", address: "", phone: "" },
      bills, answers, docs, medicaidStatus, screening, status,
      messages: [], requests, events,
      submittedAt: submittedAt.toISOString(),
      updatedAt: events[events.length - 1].at,
      sample: true,
    });
  }
  return apps;
}
