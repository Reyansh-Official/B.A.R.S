import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeMetrics } from "./metrics.ts";
import { buildSampleApplications } from "./sample-data.ts";
import type { Policy } from "./types.ts";

const policy: Policy = JSON.parse(readFileSync(new URL("../../policies/umms.json", import.meta.url), "utf8"));
const apps = buildSampleApplications(policy, 24, new Date("2026-09-26T12:00:00Z"));

test("sample data is deterministic and fully labeled", () => {
  assert.equal(apps.length, 24);
  assert.ok(apps.every((a) => a.sample));
  assert.deepEqual(buildSampleApplications(policy, 24, new Date("2026-09-26T12:00:00Z")).map((a) => a.patient.name), apps.map((a) => a.patient.name));
});

test("metrics add up", () => {
  const m = computeMetrics(apps);
  assert.equal(m.total, 24);
  assert.equal(Object.values(m.statusCounts).reduce((a, b) => a + b, 0), 24);
  const complete = apps.filter((a) => a.events[0].missingCount === 0).length;
  assert.equal(m.completeFirstTimePct, Math.round((complete / 24) * 100));
  assert.equal(m.followUpsPerApp, Math.round((apps.reduce((n, a) => n + a.requests.length, 0) / 24) * 10) / 10);
  assert.ok(m.medianHoursToReview! > 0);
});

test("empty input", () => {
  const m = computeMetrics([]);
  assert.equal(m.completeFirstTimePct, null);
  assert.equal(m.medianHoursToReview, null);
});
