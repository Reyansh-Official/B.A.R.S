import { fplFor, type FplTable } from "./build.ts";
import type { ExtractedPolicy } from "./schema.ts";

export interface StateMinimums {
  state: string;
  citation: string;
  free_care_min_pct_fpl: number;
  reduced_cost_range_pct_fpl: [number, number];
  hardship: { debt_pct_of_income: number; income_below_pct_fpl: number };
  presumptive_programs: string[];
}

export interface Check {
  id: string;
  severity: "error" | "warning" | "ok";
  message: string;
}

export interface Validation {
  status: "pass" | "warnings" | "fail";
  checks: Check[];
}

// Deterministic checks on an extracted policy. Errors block approval; warnings need a reviewer's eye.
export function validatePolicy(x: ExtractedPolicy, fpl: FplTable, min?: StateMinimums): Validation {
  const checks: Check[] = [];
  const add = (id: string, severity: Check["severity"], message: string) => checks.push({ id, severity, message });
  const bands = x.income.bands;

  if (!x.isFinancialAssistancePolicy) add("is_policy", "error", "The documents don't appear to be a financial assistance policy.");
  if (!x.facilities.length) add("facilities", "error", "No facilities listed, so bills can't be matched to this policy.");
  if (!bands.length) add("bands", "error", "No income bands were found.");

  const ascending = bands.every((b, i) => i === 0 || b.maxPctFpl > bands[i - 1].maxPctFpl);
  add("bands_ascending", ascending ? "ok" : "error", ascending ? "Income bands increase in order." : "Income bands are out of order or overlap.");
  const decreasing = bands.every((b, i) => i === 0 || b.discountPct <= bands[i - 1].discountPct);
  add("discounts_decreasing", decreasing ? "ok" : "error", decreasing ? "Discounts shrink as income rises." : "A higher income band has a bigger discount than a lower one.");
  const inRange = bands.every((b) => b.discountPct >= 0 && b.discountPct <= 100) && x.income.aboveTopBandDiscountPct >= 0;
  if (!inRange) add("discount_range", "error", "A discount is outside 0-100%.");

  if (x.income.basis !== "fpl") add("basis", "warning", `Income isn't measured as % of the federal poverty level (${x.income.basisNote}). Check the dollar table by hand.`);

  for (const t of x.income.explicitTable) {
    if (t.upperBounds.length !== bands.length) {
      add(`table_${t.householdSize}`, "warning", `Dollar table for household of ${t.householdSize} has ${t.upperBounds.length} columns but there are ${bands.length} bands.`);
      continue;
    }
    const expected = bands.map((b) => (fplFor(fpl, t.householdSize) * b.maxPctFpl) / 100);
    const off = t.upperBounds.findIndex((v, i) => Math.abs(v - expected[i]) / expected[i] > 0.05);
    if (off >= 0) {
      add(`table_${t.householdSize}`, "warning", `Household of ${t.householdSize}: $${t.upperBounds[off].toLocaleString()} doesn't match ${bands[off].maxPctFpl}% of this year's FPL ($${Math.round(expected[off]).toLocaleString()}). The table may use an older year.`);
    }
  }

  if (min && x.income.basis === "fpl" && bands.length) {
    const freeTo = bands.filter((b) => b.discountPct === 100).at(-1)?.maxPctFpl ?? 0;
    add(
      "state_free_care",
      freeTo >= min.free_care_min_pct_fpl ? "ok" : "error",
      freeTo >= min.free_care_min_pct_fpl
        ? `Free care up to ${freeTo}% FPL meets ${min.state}'s ${min.free_care_min_pct_fpl}% minimum.`
        : `Free care stops at ${freeTo}% FPL, below ${min.state}'s required ${min.free_care_min_pct_fpl}% (${min.citation}). Likely an extraction error.`,
    );
    const reducedTo = Math.max(...bands.filter((b) => b.discountPct > 0).map((b) => b.maxPctFpl));
    const [, reducedMin] = min.reduced_cost_range_pct_fpl;
    add("state_reduced_cost", reducedTo >= reducedMin ? "ok" : "warning", reducedTo >= reducedMin ? `Reduced-cost care reaches ${reducedTo}% FPL.` : `Reduced-cost care ends at ${reducedTo}% FPL; ${min.state} requires it up to ${reducedMin}%.`);
  }

  if (min) {
    if (!x.hardship.exists) add("state_hardship", "warning", `No financial hardship rule found; ${min.state} requires one (${min.citation}).`);
    const have = new Set(x.presumptive.programs.map((p) => p.id));
    const missing = min.presumptive_programs.filter((id) => !have.has(id as never));
    if (missing.length) add("state_presumptive", "warning", `Programs ${min.state} requires for automatic eligibility weren't found: ${missing.join(", ")}.`);
  }

  if (!x.contact.phone) add("contact", "warning", "No financial assistance phone number found.");
  const t = x.timelines;
  if (t.applicationWindowDays == null || t.finalDeterminationDays == null || t.missingInfoResponseDays == null) {
    add("timelines", "warning", "Some timelines weren't stated; standard defaults are used until a reviewer confirms them.");
  }
  x.uncertain.forEach((u, i) => add(`uncertain_${i}`, "warning", `Extractor flagged: ${u}`));

  const status = checks.some((c) => c.severity === "error") ? "fail" : checks.some((c) => c.severity === "warning") ? "warnings" : "pass";
  return { status, checks };
}
