import type {
  Answers,
  Bill,
  CoverageResult,
  DocState,
  EligibilityResult,
  MedicaidScreening,
  Policy,
  ReadinessResult,
  RequiredDoc,
  Screening,
} from "./types";

// Deterministic screening only: every result must trace to a rule in the policy file, never to model output.

const normalize = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
const mentions = (text: string, name: string) => normalize(text).includes(normalize(name));

export function classifyBill(policy: Policy, bill: Bill): CoverageResult {
  for (const biller of policy.not_covered_billers) {
    if ([biller.name, ...biller.aliases].some((n) => mentions(bill.billerName, n))) {
      return {
        billId: bill.id,
        status: "separate_program",
        matchedName: biller.name,
        reason: biller.reason,
        nextStep: biller.next_step,
        contactPhone: biller.contact.phone,
        sourceUrl: biller.source_url,
      };
    }
  }
  for (const facility of policy.facilities) {
    if ([facility.name, ...facility.aliases].some((n) => mentions(bill.billerName, n))) {
      return {
        billId: bill.id,
        status: "covered",
        matchedName: facility.name,
        reason: `${facility.name} is a ${policy.name} member covered by the ${policy.policy.title}.`,
        sourceUrl: policy.policy.url,
      };
    }
  }
  return {
    billId: bill.id,
    status: "counselor_review",
    reason: `"${bill.billerName}" is not on this policy's list of covered or separately billing providers.`,
    sourceUrl: policy.provider_lists_url,
  };
}

export function screenEligibility(policy: Policy, answers: Answers, coveredDebt: number): EligibilityResult {
  const rules = policy.income_rules;
  const presumptive = policy.presumptive_eligibility.qualifying.filter((q) => answers.benefits.includes(q.id));
  if (presumptive.length > 0) {
    return {
      status: "presumptive",
      discountPct: 100,
      reason: `${presumptive.map((q) => q.label).join(", ")} qualifies for presumptive eligibility: ${policy.presumptive_eligibility.result}`,
      source: policy.presumptive_eligibility.source,
    };
  }
  if (answers.thirdPartyInjury) {
    return {
      status: "counselor_review",
      discountPct: 0,
      reason: "Injuries from an accident, workplace, or legal claim must go through those payment sources first.",
      source: "Policy p.7",
    };
  }
  const table = rules.by_household_size[String(answers.householdSize)];
  if (!table) {
    return {
      status: "counselor_review",
      discountPct: 0,
      reason: `The published income table does not list a household of ${answers.householdSize}.`,
      source: rules.source,
    };
  }

  const pctOfMdhLimit = Math.round((answers.annualIncome / table.mdh_limit_2025) * 100);
  const band = table.band_upper_bounds.findIndex((upper) => answers.annualIncome <= upper);
  const hardship = coveredDebt > (answers.annualIncome * policy.financial_hardship.threshold_pct_of_income) / 100;
  const income = `$${answers.annualIncome.toLocaleString()} for a household of ${answers.householdSize}`;

  if (band === -1) {
    const top = table.band_upper_bounds[table.band_upper_bounds.length - 1];
    return hardship
      ? {
          status: "hardship_review",
          discountPct: 0,
          pctOfMdhLimit,
          reason: `${income} is above $${top.toLocaleString()}, but medical debt exceeds ${policy.financial_hardship.threshold_pct_of_income}% of income.`,
          source: policy.financial_hardship.source,
        }
      : {
          status: "not_eligible_by_income",
          discountPct: rules.above_top_band_discount_pct,
          pctOfMdhLimit,
          reason: `${income} is above $${top.toLocaleString()}, the reduced-cost limit. A counselor can still discuss payment plans.`,
          source: rules.source,
        };
  }

  const discountPct = rules.band_discounts_pct[band];
  const lower = band === 0 ? 0 : table.band_upper_bounds[band - 1] + 1;
  const bandPct = band === 0 ? `up to ${rules.bands_pct_of_mdh[0]}%` : `${rules.bands_pct_of_mdh[band - 1]}-${rules.bands_pct_of_mdh[band]}%`;
  return {
    status: "potentially_eligible",
    discountPct,
    pctOfMdhLimit,
    reason:
      `${income} falls in the $${lower.toLocaleString()}-$${table.band_upper_bounds[band].toLocaleString()} range (${bandPct} of the Maryland income limit), which qualifies for ${discountPct === 100 ? "free care" : `a ${discountPct}% discount`}.` +
      (hardship && discountPct < 100 ? " Medical debt also exceeds the hardship threshold; a counselor may apply a larger reduction." : ""),
    source: rules.source,
  };
}

function docApplies(appliesWhen: string, answers: Answers, presumptive: boolean): boolean {
  if (presumptive) return false;
  switch (appliesWhen) {
    case "always":
      return true;
    case "employed":
    case "self_employed":
    case "unemployed":
      return answers.employment === appliesWhen;
    case "has_benefit_income":
      return answers.hasBenefitIncome || answers.employment === "retired" || answers.employment === "disability";
    case "applied_for_medicaid":
      return answers.appliedForMedicaid;
    case "married":
      return answers.married;
    default:
      return true;
  }
}

export function requiredDocuments(policy: Policy, answers: Answers, presumptive: boolean): Policy["documents"] {
  return policy.documents.filter((d) => {
    if (d.id === "signature") return true;
    if (d.id === "spouse_signature") return answers.married;
    return docApplies(d.applies_when, answers, presumptive);
  });
}

export function assessReadiness(
  policy: Policy,
  answers: Answers,
  eligibility: EligibilityResult,
  docs: Record<string, DocState>,
  medicaid: MedicaidScreening,
): ReadinessResult {
  const presumptive = eligibility.status === "presumptive";
  const documents: RequiredDoc[] = requiredDocuments(policy, answers, presumptive).map((d) => ({
    id: d.id,
    label: d.label,
    alternatives: d.alternatives,
    note: d.note,
    status: docs[d.id]?.status ?? "missing",
    statusNote: docs[d.id]?.note,
    files: docs[d.id]?.files,
  }));

  const flags: string[] = [];
  if (medicaid === "unknown" || medicaid === "pending") {
    flags.push(`Medicaid screening is required for uninsured patients (status: ${medicaid}).`);
  }
  if (presumptive) flags.push("Counselor confirms enrollment in the qualifying program.");
  if (eligibility.status === "counselor_review" || eligibility.status === "hardship_review") flags.push(eligibility.reason);
  if (documents.some((d) => d.status === "counselor")) flags.push("Patient asked for counselor help with a document.");

  const missing = documents.filter((d) => d.status === "missing").map((d) => d.label);
  const status = flags.length > 0 ? "counselor_review" : missing.length > 0 ? "missing_info" : "ready";
  return { status, documents, missing, flags };
}

export function screen(
  policy: Policy,
  bills: Bill[],
  answers: Answers,
  docs: Record<string, DocState>,
  medicaidStatus: MedicaidScreening = "unknown",
): Screening {
  const coverage = bills.map((b) => classifyBill(policy, b));
  const coveredDebt = bills
    .filter((_, i) => coverage[i].status === "covered")
    .reduce((sum, b) => sum + b.amountOwed, 0);
  const eligibility = screenEligibility(policy, answers, coveredDebt);
  const medicaidScreening: MedicaidScreening = answers.insured ? "not_required" : medicaidStatus;
  const readiness = assessReadiness(policy, answers, eligibility, docs, medicaidScreening);

  const estimatedOwed: Record<string, number | null> = {};
  bills.forEach((b, i) => {
    estimatedOwed[b.id] =
      coverage[i].status === "covered" && ["presumptive", "potentially_eligible"].includes(eligibility.status)
        ? Math.round(b.amountOwed * (100 - eligibility.discountPct)) / 100
        : null;
  });

  return {
    policyId: policy.id,
    policyRevision: policy.policy.revision,
    coverage,
    eligibility,
    readiness,
    medicaidScreening,
    estimatedOwed,
  };
}
