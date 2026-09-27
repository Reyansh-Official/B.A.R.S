import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { screenEligibility } from "../rules.ts";
import { buildPolicy, type FplTable } from "./build.ts";
import type { Answers } from "../types.ts";
import type { ExtractedPolicy } from "./schema.ts";
import { validatePolicy, type StateMinimums } from "./validate.ts";

const read = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const fpl: FplTable = read("../../../policies/programs/md-medicaid.json").fpl_2026;
const md: StateMinimums = read("../../../policies/state-minimums/md.json");

const good: ExtractedPolicy = {
  isFinancialAssistancePolicy: true,
  hospitalSystemName: "Example Regional Health",
  facilities: [{ name: "Example Regional Medical Center", aliases: ["ERMC"] }],
  policyTitle: "Financial Assistance Policy",
  effectiveDate: "2026-01-01",
  income: {
    basis: "fpl",
    basisNote: "Household income as % of federal poverty guidelines",
    bands: [
      { maxPctFpl: 200, discountPct: 100 },
      { maxPctFpl: 250, discountPct: 60 },
      { maxPctFpl: 300, discountPct: 30 },
    ],
    aboveTopBandDiscountPct: 0,
    explicitTable: [{ householdSize: 1, upperBounds: [31920, 39900, 47880] }],
    source: "Policy p.2",
  },
  hardship: { exists: true, debtPctOfIncome: 25, incomeBelowPctFpl: 500, rule: "Debt over 25% of income", source: "Policy p.3" },
  presumptive: {
    programs: ["snap", "wic", "energy", "school_lunch", "pac"].map((id) => ({ id: id as never, label: id.toUpperCase() })),
    result: "Free care",
    source: "Policy p.3",
  },
  documents: [{ id: "income_proof", label: "Pay stubs", appliesWhen: "employed", alternatives: ["Employer letter"], source: "Application p.1" }],
  notCoveredBillers: [{ name: "Example Emergency Physicians LLC", aliases: ["EEP"], nextStep: "Call their billing office.", phone: "555-0100", source: "Provider list p.1" }],
  exclusions: ["Cosmetic services"],
  timelines: { applicationWindowDays: 240, finalDeterminationDays: 14, missingInfoResponseDays: 30, source: "Policy p.4" },
  contact: { phone: "555-0199", email: null, fax: null, mail: null, hours: null },
  uncertain: [],
};

test("a sound Maryland policy passes validation", () => {
  const v = validatePolicy(good, fpl, md);
  assert.equal(v.status, "pass", JSON.stringify(v.checks.filter((c) => c.severity !== "ok")));
});

test("built policy works in the rules engine with FPL-based dollar bands", () => {
  const policy = buildPolicy({ hospitalId: "example", extracted: good, fpl, sources: [{ kind: "policy", url: "https://example.org/fap.pdf" }] });
  assert.deepEqual(policy.income_rules.by_household_size["1"].band_upper_bounds, [31920, 39900, 47880]);
  assert.deepEqual(policy.income_rules.by_household_size["4"].band_upper_bounds, [66000, 82500, 99000]);
  const base: Omit<Answers, "annualIncome"> = { householdSize: 4, employment: "employed", insured: true, married: true, benefits: [], hasBenefitIncome: false, housing: "rent", thirdPartyInjury: false, appliedForMedicaid: false };
  assert.equal(screenEligibility(policy, { ...base, annualIncome: 60000 }, 0).discountPct, 100);
  assert.equal(screenEligibility(policy, { ...base, annualIncome: 90000 }, 0).discountPct, 30);
  assert.match(screenEligibility(policy, { ...base, annualIncome: 70000 }, 0).reason, /federal poverty level/);
});

test("free care below the Maryland minimum is an error", () => {
  const v = validatePolicy({ ...good, income: { ...good.income, bands: [{ maxPctFpl: 150, discountPct: 100 }, { maxPctFpl: 300, discountPct: 40 }], explicitTable: [] } }, fpl, md);
  assert.equal(v.status, "fail");
  assert.ok(v.checks.some((c) => c.id === "state_free_care" && c.severity === "error"));
});

test("inverted discounts and missing state programs are caught", () => {
  const v = validatePolicy(
    { ...good, income: { ...good.income, bands: [{ maxPctFpl: 200, discountPct: 50 }, { maxPctFpl: 300, discountPct: 80 }], explicitTable: [] }, presumptive: { ...good.presumptive, programs: [] } },
    fpl,
    md,
  );
  assert.ok(v.checks.some((c) => c.id === "discounts_decreasing" && c.severity === "error"));
  assert.ok(v.checks.some((c) => c.id === "state_presumptive" && c.severity === "warning"));
});

test("a dollar table from an older year is a warning, not silently trusted", () => {
  const v = validatePolicy({ ...good, income: { ...good.income, explicitTable: [{ householdSize: 1, upperBounds: [29000, 36000, 43000] }] } }, fpl, md);
  assert.ok(v.checks.some((c) => c.id === "table_1" && c.severity === "warning"));
});
