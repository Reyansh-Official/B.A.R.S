import { test } from "node:test";
import assert from "node:assert/strict";
import { groupBills } from "./groups.ts";
import type { Bill } from "./types.ts";

const bill = (id: string, billerName: string): Bill => ({ id, billerName, serviceDate: "2026-08-15", amountOwed: 100 });
const home = { id: "umms", name: "University of Maryland Medical System" };

test("unresolved bills belong to the home hospital; physician bills join their hospital", () => {
  const groups = groupBills([bill("a", "UMMC"), bill("b", "Faculty Physicians")], { b: { kind: "separate_program", hospitalId: "umms", hospitalName: home.name, billerName: "FPI" } }, home);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].bills.length, 2);
});

test("bills from other hospitals form their own groups, ordered home, live, pending, unknown", () => {
  const groups = groupBills(
    [bill("x", "Quest"), bill("m", "MedStar"), bill("h", "Hopkins"), bill("u", "UMMC")],
    {
      x: { kind: "unknown" },
      m: { kind: "hospital", hospitalId: "medstar", hospitalName: "MedStar", status: "pending" },
      h: { kind: "hospital", hospitalId: "hopkins", hospitalName: "Johns Hopkins", status: "live" },
    },
    home,
  );
  assert.deepEqual(groups.map((g) => `${g.hospitalId}:${g.status}`), ["umms:live", "hopkins:live", "medstar:pending", "null:unknown"]);
});
