import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate } from "./check-document.ts";

const today = new Date("2026-09-26");
const stub = {
  readable: true, documentType: "pay_stub" as const, personName: "Omar Rahman", issuer: "Harbor Point Logistics LLC",
  documentDate: "2026-09-18", taxYear: null, amount: 1769.6, frequency: "biweekly" as const, address: null,
};

test("spouse pay stub below household income passes and is annualized", () => {
  const r = evaluate(stub, { docId: "income_proof", fileName: "a.pdf", statedIncome: 98000, today });
  assert.equal(r.verdict, "ok");
  assert.equal(r.annualizedIncome, 46010);
});

test("pay stub above stated household income suggests an update", () => {
  const r = evaluate({ ...stub, amount: 2450.4 }, { docId: "income_proof", fileName: "a.pdf", statedIncome: 52000, today });
  assert.equal(r.verdict, "warn");
  assert.equal(r.suggestedIncome, 63710);
});

test("wrong document type is flagged", () => {
  const r = evaluate({ ...stub, documentType: "medical_bill", amount: 4850, frequency: null }, { docId: "income_proof", fileName: "a.pdf", statedIncome: 98000, today });
  assert.equal(r.verdict, "wrong_type");
});

test("old pay stub asks for the most recent one", () => {
  const r = evaluate({ ...stub, documentDate: "2026-03-01" }, { docId: "income_proof", fileName: "a.pdf", statedIncome: 98000, today });
  assert.equal(r.verdict, "warn");
});

test("weekly unemployment benefit annualizes and matches", () => {
  const r = evaluate({ ...stub, documentType: "unemployment_statement", amount: 427, frequency: "weekly", documentDate: "2026-09-08" }, { docId: "unemployment_proof", fileName: "a.pdf", statedIncome: 22200, today });
  assert.equal(r.verdict, "ok");
  assert.equal(r.annualizedIncome, 22204);
});

test("unreadable file", () => {
  assert.equal(evaluate({ ...stub, readable: false }, { docId: "income_proof", fileName: "a.pdf", statedIncome: 1, today }).verdict, "unreadable");
});
