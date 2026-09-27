import { test } from "node:test";
import assert from "node:assert/strict";
import { dueReminders, toE164 } from "./reminder-rules.ts";

const base = {
  id: "app1",
  status: "submitted" as const,
  requests: [] as { docIds: string[]; message: string; at: string; dueBy: string; resolvedAt?: string }[],
  medicaidStatus: "unknown" as const,
  screening: { medicaid: undefined } as never,
};
const kinds = (r: ReturnType<typeof dueReminders>) => r.map((x) => x.kind);

test("welcome is always due; nothing else for a quiet application", () => {
  assert.deepEqual(kinds(dueReminders(base, "UMMS", "https://x", new Date("2026-09-27"))), ["welcome"]);
});

test("document request: notice, then 7-day and 2-day warnings (one stage at a time), none after the deadline or once answered", () => {
  const app = { ...base, requests: [{ docIds: ["income_proof"], message: "", at: "2026-09-27T00:00:00Z", dueBy: "2026-10-27T00:00:00Z" }] };
  assert.deepEqual(kinds(dueReminders(app, "UMMS", "l", new Date("2026-09-28"))), ["welcome", "info_request"]);
  assert.deepEqual(kinds(dueReminders(app, "UMMS", "l", new Date("2026-10-21"))), ["welcome", "info_request_7d"]);
  assert.deepEqual(kinds(dueReminders(app, "UMMS", "l", new Date("2026-10-26"))), ["welcome", "info_request_2d"]);
  assert.deepEqual(kinds(dueReminders(app, "UMMS", "l", new Date("2026-10-28"))), ["welcome"]);
  const answered = { ...app, requests: [{ ...app.requests[0], resolvedAt: "2026-10-01T00:00:00Z" }] };
  assert.deepEqual(kinds(dueReminders(answered, "UMMS", "l", new Date("2026-10-26"))), ["welcome"]);
});

test("Medicaid apply-by warnings only while the patient hasn't applied", () => {
  const app = { ...base, screening: { medicaid: { status: "possible", applyBy: "2026-10-31", coveredBills: [], reason: "" } } as never };
  assert.deepEqual(kinds(dueReminders(app, "UMMS", "l", new Date("2026-10-26"))), ["welcome", "medicaid_7d"]);
  assert.deepEqual(kinds(dueReminders(app, "UMMS", "l", new Date("2026-10-30"))), ["welcome", "medicaid_2d"]);
  assert.deepEqual(kinds(dueReminders({ ...app, medicaidStatus: "pending" as never }, "UMMS", "l", new Date("2026-10-30"))), ["welcome"]);
});

test("in review notice and US phone formatting", () => {
  assert.ok(kinds(dueReminders({ ...base, status: "in_review" as never }, "UMMS", "l", new Date())).includes("in_review"));
  assert.equal(toE164("(410) 555-0142"), "+14105550142");
  assert.equal(toE164("+1 410 555 0142"), "+14105550142");
  assert.equal(toE164("555-0142"), null);
});
