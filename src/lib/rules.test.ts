import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { screen, screenEligibility, classifyBill } from "./rules.ts";
import type { Answers, Policy } from "./types.ts";

const root = new URL("../../", import.meta.url);
const policy: Policy = JSON.parse(readFileSync(new URL("policies/umms.json", root), "utf8"));
const { cases } = JSON.parse(readFileSync(new URL("demo-cases/cases.json", root), "utf8"));

for (const c of cases) {
  test(`demo case: ${c.id}`, () => {
    const result = screen(policy, c.bills, c.answers, c.docs, c.medicaidStatus);
    const coverage = Object.fromEntries(result.coverage.map((r) => [r.billId, r.status]));
    assert.deepEqual(coverage, c.expected.coverage);
    assert.equal(result.eligibility.status, c.expected.eligibility);
    assert.equal(result.eligibility.discountPct, c.expected.discountPct);
    assert.equal(result.readiness.status, c.expected.readiness);
    assert.deepEqual(result.readiness.missing, c.expected.missing);
    assert.deepEqual(result.estimatedOwed, c.expected.estimatedOwed);
  });
}

const base: Answers = cases[0].answers;
const james = cases.find((c: { id: string }) => c.id === "james");

test("band edges: household of 1", () => {
  const at = (annualIncome: number) => screenEligibility(policy, { ...base, householdSize: 1, annualIncome }, 0).discountPct;
  assert.equal(at(43224), 100);
  assert.equal(at(43225), 90);
  assert.equal(at(64836), 10);
  assert.equal(at(64837), 0);
});

test("SNAP makes James presumptively eligible with no income or housing documents", () => {
  const result = screen(policy, james.bills, { ...james.answers, benefits: ["snap"] }, {}, "completed");
  assert.equal(result.eligibility.status, "presumptive");
  assert.deepEqual(result.readiness.documents.map((d) => d.id), ["signature"]);
});

test("above the top band with heavy debt goes to hardship review", () => {
  const r = screenEligibility(policy, { ...base, householdSize: 1, annualIncome: 70000 }, 20000);
  assert.equal(r.status, "hardship_review");
});

test("above the top band without heavy debt is not eligible by income", () => {
  assert.equal(screenEligibility(policy, { ...base, householdSize: 1, annualIncome: 70000 }, 1000).status, "not_eligible_by_income");
});

test("third-party injury and oversized households go to a counselor", () => {
  assert.equal(screenEligibility(policy, { ...base, thirdPartyInjury: true }, 0).status, "counselor_review");
  assert.equal(screenEligibility(policy, { ...base, householdSize: 13 }, 0).status, "counselor_review");
});

test("unknown billers go to a counselor, aliases match", () => {
  const bill = { id: "x", serviceDate: "2026-01-01", amountOwed: 10 };
  assert.equal(classifyBill(policy, { ...bill, billerName: "Acme Home Health LLC" }).status, "counselor_review");
  assert.equal(classifyBill(policy, { ...bill, billerName: "UM Upper Chesapeake Health" }).status, "covered");
  assert.equal(classifyBill(policy, { ...bill, billerName: "FPI Physician Billing" }).status, "separate_program");
});
