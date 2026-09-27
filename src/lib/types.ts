export type Employment = "employed" | "self_employed" | "unemployed" | "retired" | "disability";
export type Housing = "rent" | "own" | "living_with_family" | "homeless" | "other";

export interface Alternative {
  id: string;
  label: string;
  kind: "upload" | "form";
  form?: "faf116_unemployed" | "faf116_shelter" | "housing_statement";
  hint?: string;
}

export interface Policy {
  id: string;
  name: string;
  policy: {
    title: string;
    revision: string;
    income_table_effective: string;
    url: string;
    sliding_scale_url: string;
    application_url: string;
    overview_url: string;
  };
  facilities: { id: string; name: string; aliases: string[]; professional?: boolean }[];
  not_covered_billers: {
    id: string;
    name: string;
    aliases: string[];
    reason: string;
    next_step: string;
    contact: { phone: string; label: string };
    source_url: string;
    verified: string;
  }[];
  provider_lists_url: string;
  income_rules: {
    bands_pct_of_mdh: number[];
    band_discounts_pct: number[];
    above_top_band_discount_pct: number;
    by_household_size: Record<string, { fpl_2025: number; mdh_limit_2025: number; band_upper_bounds: number[] }>;
    source: string;
  };
  financial_hardship: { threshold_pct_of_income: number; rule: string; source: string };
  presumptive_eligibility: { result: string; qualifying: { id: string; label: string }[]; source: string };
  documents: {
    id: string;
    label: string;
    applies_when: string;
    alternatives: Alternative[];
    note?: string;
    source: string;
  }[];
  timelines: {
    application_window_days: number;
    probable_eligibility_business_days: number;
    final_determination_days: number;
    missing_info_response_days: number;
  };
  contact: { phone: string; phone_toll_free: string; email: string; fax: string; mail: string; hours: string };
}

export interface Bill {
  id: string;
  billerName: string;
  accountNumber?: string;
  serviceDate: string;
  statementDate?: string;
  amountOwed: number;
  billerPhone?: string;
  uncertainFields?: string[];
}

export interface Answers {
  householdSize: number;
  annualIncome: number;
  employment: Employment;
  insured: boolean;
  married: boolean;
  benefits: string[];
  hasBenefitIncome: boolean;
  housing: Housing;
  thirdPartyInjury: boolean;
  appliedForMedicaid: boolean;
}

export type DocStatus = "provided" | "alternative" | "missing" | "counselor";

export interface UploadedFile {
  name: string;
  type: string;
  dataUrl: string;
}

export interface DocCheck {
  fileName: string;
  verdict: "ok" | "warn" | "wrong_type" | "unreadable";
  documentType?: string;
  summary: string;
  details: string[];
  annualizedIncome?: number;
  suggestedIncome?: number;
}

export interface DocState {
  status: DocStatus;
  note?: string;
  alternativeId?: string;
  files?: UploadedFile[];
  checks?: DocCheck[];
}

export type MedicaidScreening = "not_required" | "unknown" | "pending" | "completed";

export interface CoverageResult {
  billId: string;
  status: "covered" | "separate_program" | "counselor_review";
  matchedName?: string;
  reason: string;
  nextStep?: string;
  contactPhone?: string;
  sourceUrl?: string;
}

export interface EligibilityResult {
  status: "presumptive" | "potentially_eligible" | "hardship_review" | "not_eligible_by_income" | "counselor_review";
  discountPct: number;
  pctOfMdhLimit?: number;
  reason: string;
  source: string;
}

export interface RequiredDoc {
  id: string;
  label: string;
  alternatives: Alternative[];
  note?: string;
  status: DocStatus;
  statusNote?: string;
  files?: UploadedFile[];
  checks?: DocCheck[];
}

export interface ReadinessResult {
  status: "ready" | "missing_info" | "counselor_review";
  documents: RequiredDoc[];
  missing: string[];
  flags: string[];
}

export interface Screening {
  policyId: string;
  policyRevision: string;
  coverage: CoverageResult[];
  eligibility: EligibilityResult;
  readiness: ReadinessResult;
  medicaidScreening: MedicaidScreening;
  estimatedOwed: Record<string, number | null>;
}
