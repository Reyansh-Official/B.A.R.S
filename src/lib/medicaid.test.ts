import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyByDate, prescreenMedicaid, type MedicaidProgram } from "./medicaid.ts";
import { screen } from "./rules.ts";
import type { Answers, Policy } from "./types.ts";

const p: MedicaidProgram = JSON.parse(readFileSync(new URL("../../policies/programs/md-medicaid.json", import.meta.url), "utf8"));
const policy: Policy = JSON.parse(readFileSync(new URL("../../policies/umms.json", import.meta.url), "utf8"));
const { cases } = JSON.parse(readFileSync(new URL("../../demo-cases/cases.json", import.meta.url), "utf8"));
const today = new Date("2026-09-26T12:00:00Z");
const james = cases.find((c: { id: string }) => c.id === "james");
const base: Answers = { ...james.answers };

test("James is just over the adult limit, so possible, and his July visit is covered if he applies by Oct 31", () => {
  const r = prescreenMedicaid(p, base, james.bills, today);
  assert.equal(r.status, "possible");
  assert.equal(r.monthlyIncome, 1850);
  assert.equal(r.monthlyLimit, 1835);
  assert.equal(r.applyBy, "2026-10-31");
});

test("clearly under the adult limit is likely", () => {
  assert.equal(prescreenMedicaid(p, { ...base, annualIncome: 18000 }, [], today).status, "likely");
});

test("well over the limit is unlikely; insured, on Medicaid, or 65+ is not applicable", () => {
  assert.equal(prescreenMedicaid(p, { ...base, annualIncome: 40000 }, [], today).status, "unlikely");
  assert.equal(prescreenMedicaid(p, { ...base, insured: true }, [], today).status, "not_applicable");
  assert.equal(prescreenMedicaid(p, { ...base, benefits: ["medicaid"] }, [], today).status, "not_applicable");
  assert.equal(prescreenMedicaid(p, base, [], today, 70).status, "not_applicable");
});

test("pregnancy counts in household size and uses the 264% limit", () => {
  const r = prescreenMedicaid(p, { ...base, pregnant: true, annualIncome: 50000 }, [], today);
  assert.equal(r.group, "pregnant");
  assert.equal(r.monthlyLimit, 4763);
  assert.equal(r.status, "likely");
});

test("children under 19 flagged for MCHP up to 322%", () => {
  const r = prescreenMedicaid(p, { ...base, householdSize: 4, annualIncome: 100000, childrenUnder19: true }, [], today);
  assert.equal(r.childrenMayQualify, true);
});

test("retroactive window: 3 months now, shrinking on Jan 1 2027", () => {
  assert.equal(applyByDate(p, "2026-07-20", "adult", today), "2026-10-31");
  assert.equal(applyByDate(p, "2026-11-05", "adult", new Date("2026-11-10")), "2026-12-31");
  assert.equal(applyByDate(p, "2026-11-05", "pregnant", new Date("2026-11-10")), "2027-01-31");
  assert.equal(applyByDate(p, "2026-05-01", "adult", today), null);
});

test("screen() adds a Medicaid-first flag for James", () => {
  const s = screen(policy, james.bills, james.answers, james.docs, "unknown", { medicaid: p, today });
  assert.equal(s.medicaid?.status, "possible");
  assert.match(s.readiness.flags[0], /Possibly eligible for Medicaid/);
});
