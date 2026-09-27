import { test } from "node:test";
import assert from "node:assert/strict";
import { identityChecks, namesMatch } from "./identity.ts";

test("names match across billing formats, initials, suffixes, and accents", () => {
  assert.equal(namesMatch("Maria Santos", "SANTOS, MARIA L"), "match");
  assert.equal(namesMatch("José Garcia-Lopez", "Jose Garcia Lopez"), "match");
  assert.equal(namesMatch("Robert King Jr.", "robert king"), "match");
  assert.equal(namesMatch("Maria Santos", "Maria Santos-Reyes"), "match");
});

test("different people or missing names are flagged, not guessed", () => {
  assert.equal(namesMatch("Maria Santos", "Luis Santos"), "mismatch");
  assert.equal(namesMatch("Maria Santos", undefined), "unknown");
  assert.equal(namesMatch("", "Maria Santos"), "unknown");
});

test("identity checks cover bills, document names, and phone", () => {
  const checks = identityChecks({
    patient: { name: "Maria Santos", dob: "", address: "", phone: "" },
    bills: [
      { id: "a", billerName: "UMMC", serviceDate: "", amountOwed: 1, patientName: "SANTOS, MARIA" },
      { id: "b", billerName: "UPI", serviceDate: "", amountOwed: 1, patientName: "Luis Santos" },
    ],
    docs: {
      income_proof: { status: "provided", checks: [
        { fileName: "stub.pdf", verdict: "ok", summary: "", details: [], personName: "Luis Santos" },
        { fileName: "w2.pdf", verdict: "ok", summary: "", details: [], personName: "Maria Santos" },
      ] },
    },
    phoneVerifiedAt: "2026-09-27T00:00:00Z",
  });
  assert.deepEqual(checks.map((c) => c.status), ["ok", "review", "review", "ok", "ok"]);
});
