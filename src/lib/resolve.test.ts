import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveBiller, slugify, type KnownHospital } from "./resolve.ts";
import type { Policy } from "./types.ts";

const umms: Policy = JSON.parse(readFileSync(new URL("../../policies/umms.json", import.meta.url), "utf8"));
const hospitals: KnownHospital[] = [
  { id: "umms", name: umms.name, aliases: umms.facilities.flatMap((f) => [f.name, ...f.aliases]), status: "live", policy: umms },
  { id: "johns-hopkins-hospital", name: "The Johns Hopkins Hospital", aliases: ["Johns Hopkins Hospital", "JHH"], status: "pending" },
];

test("UMMC hospital bill resolves to the UMMS policy", () => {
  assert.deepEqual(resolveBiller({ billerName: "University of Maryland Medical Center" }, hospitals), { kind: "hospital", hospitalId: "umms", hospitalName: umms.name, status: "live" });
});

test("Faculty Physicians bill is the UMMS-linked separate program, not a hospital", () => {
  const r = resolveBiller({ billerName: "University of Maryland Faculty Physicians, Inc." }, hospitals);
  assert.equal(r.kind, "separate_program");
});

test("known pending hospital matches, with its status", () => {
  const r = resolveBiller({ billerName: "THE JOHNS HOPKINS HOSPITAL" }, hospitals);
  assert.equal(r.kind === "hospital" && r.status, "pending");
});

test("unfamiliar biller is unknown", () => {
  assert.equal(resolveBiller({ billerName: "MedStar Union Memorial Hospital" }, hospitals).kind, "unknown");
});

test("slugify", () => {
  assert.equal(slugify("MedStar Union Memorial Hospital, Inc."), "medstar-union-memorial-hospital-inc");
});
