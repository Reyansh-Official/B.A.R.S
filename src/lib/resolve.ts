import type { Bill, Policy } from "./types";

export interface KnownHospital {
  id: string;
  name: string;
  aliases: string[];
  status: "live" | "pending" | "failed";
  policy?: Policy;
}

export type Resolution =
  | { kind: "hospital"; hospitalId: string; hospitalName: string; status: "live" | "pending" | "failed" }
  | { kind: "separate_program"; hospitalId: string; hospitalName: string; billerName: string }
  | { kind: "unknown" };

const normalize = (s: string) => ` ${s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").replace(/\b(the|inc|llc|corp)\b/g, " ").replace(/\s+/g, " ").trim()} `;
const mentions = (text: string, name: string) => name.trim().length > 2 && normalize(text).includes(normalize(name));

// Deterministic: an exact alias match wins; otherwise the bill is unknown and goes to the import pipeline.
export function resolveBiller(bill: Pick<Bill, "billerName">, hospitals: KnownHospital[]): Resolution {
  // Physician groups listed in a hospital's policy are "separate programs" tied to that hospital.
  for (const h of hospitals) {
    for (const b of h.policy?.not_covered_billers ?? []) {
      if ([b.name, ...b.aliases].some((n) => mentions(bill.billerName, n))) {
        return { kind: "separate_program", hospitalId: h.id, hospitalName: h.name, billerName: b.name };
      }
    }
  }
  const matches = hospitals.filter((h) => [h.name, ...h.aliases].some((n) => mentions(bill.billerName, n)));
  if (!matches.length) return { kind: "unknown" };
  // Prefer the most specific (longest) alias, so "UM Upper Chesapeake" beats a bare "UM".
  const best = matches.sort((a, b) => longest(b, bill.billerName) - longest(a, bill.billerName))[0];
  return { kind: "hospital", hospitalId: best.id, hospitalName: best.name, status: best.status };
}

function longest(h: KnownHospital, text: string) {
  return Math.max(...[h.name, ...h.aliases].filter((n) => mentions(text, n)).map((n) => n.length));
}

export const slugify = (name: string) =>
  name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
