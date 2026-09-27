import { slugify } from "../resolve.ts";
import type { Alternative, Policy } from "../types.ts";
import type { ExtractedPolicy } from "./schema.ts";

export interface FplTable {
  by_household_size: Record<string, number>;
  each_additional: number;
}

export const fplFor = (fpl: FplTable, size: number) => fpl.by_household_size[String(size)] ?? fpl.by_household_size["8"] + (size - 8) * fpl.each_additional;

// Defaults used only when a policy doesn't state a timeline; validate.ts flags each one for review.
export const DEFAULT_TIMELINES = { application_window_days: 240, probable_eligibility_business_days: 2, final_determination_days: 14, missing_info_response_days: 30 };

export interface BuildInput {
  hospitalId: string;
  extracted: ExtractedPolicy;
  fpl: FplTable;
  sources: { kind: string; url: string }[];
}

// Pure conversion from Claude's extraction into the same format the hand-verified UMMS policy uses.
export function buildPolicy({ hospitalId, extracted: x, fpl, sources }: BuildInput): Policy {
  const url = (kind: string) => sources.find((s) => s.kind === kind)?.url ?? sources[0]?.url ?? "";
  const bands = x.income.bands;
  const by_household_size: Policy["income_rules"]["by_household_size"] = {};
  for (let size = 1; size <= 12; size++) {
    const base = fplFor(fpl, size);
    const explicit = x.income.explicitTable.find((t) => t.householdSize === size);
    const bounds = explicit && explicit.upperBounds.length === bands.length ? explicit.upperBounds : bands.map((b) => Math.round((base * b.maxPctFpl) / 100));
    by_household_size[String(size)] = { fpl_2025: base, mdh_limit_2025: base, band_upper_bounds: bounds };
  }

  const docId = (d: ExtractedPolicy["documents"][number]) => d.id ?? slugify(d.label);
  return {
    id: hospitalId,
    name: x.hospitalSystemName,
    policy: {
      title: x.policyTitle,
      revision: x.effectiveDate ?? "unknown",
      income_table_effective: x.effectiveDate ?? "unknown",
      url: url("policy"),
      sliding_scale_url: url("sliding_scale"),
      application_url: url("application"),
      overview_url: url("plain_language_summary"),
    },
    facilities: x.facilities.map((f) => ({ id: slugify(f.name), name: f.name, aliases: f.aliases })),
    not_covered_billers: x.notCoveredBillers.map((b) => ({
      id: slugify(b.name),
      name: b.name,
      aliases: b.aliases,
      reason: `${b.name} bills separately and is not covered by the ${x.policyTitle}.`,
      next_step: b.nextStep,
      contact: { phone: b.phone ?? x.contact.phone ?? "", label: "Billing office" },
      source_url: url("provider_list"),
      verified: new Date().toISOString().slice(0, 10),
    })),
    provider_lists_url: url("provider_list"),
    income_rules: {
      bands_pct_of_mdh: bands.map((b) => b.maxPctFpl),
      band_discounts_pct: bands.map((b) => b.discountPct),
      above_top_band_discount_pct: x.income.aboveTopBandDiscountPct,
      by_household_size,
      limit_label: x.income.basis === "fpl" ? "federal poverty level" : "hospital's income limit",
      source: x.income.source,
    },
    financial_hardship: {
      threshold_pct_of_income: x.hardship.debtPctOfIncome ?? 0,
      rule: x.hardship.rule,
      source: x.hardship.source,
    },
    presumptive_eligibility: {
      result: x.presumptive.result,
      qualifying: x.presumptive.programs.map((p) => ({ id: p.id ?? slugify(p.label), label: p.label })),
      source: x.presumptive.source,
    },
    documents: x.documents.map((d) => ({
      id: docId(d),
      label: d.label,
      applies_when: d.appliesWhen,
      alternatives: d.alternatives.map((a): Alternative => ({ id: slugify(a), label: a, kind: "upload" })),
      source: d.source,
    })),
    timelines: {
      application_window_days: x.timelines.applicationWindowDays ?? DEFAULT_TIMELINES.application_window_days,
      probable_eligibility_business_days: DEFAULT_TIMELINES.probable_eligibility_business_days,
      final_determination_days: x.timelines.finalDeterminationDays ?? DEFAULT_TIMELINES.final_determination_days,
      missing_info_response_days: x.timelines.missingInfoResponseDays ?? DEFAULT_TIMELINES.missing_info_response_days,
    },
    contact: {
      phone: x.contact.phone ?? "",
      phone_toll_free: "",
      email: x.contact.email ?? "",
      fax: x.contact.fax ?? "",
      mail: x.contact.mail ?? "",
      hours: x.contact.hours ?? "",
    },
  };
}
