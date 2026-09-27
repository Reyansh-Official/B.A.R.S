import type { Answers, Bill } from "./types";

export interface MedicaidProgram {
  id: string;
  name: string;
  effective: string;
  sources: Record<string, string>;
  fpl_2026: { by_household_size: Record<string, number>; each_additional: number };
  groups: Record<"adult" | "pregnant" | "child", { label: string; pct_fpl: number; monthly_limit: Record<string, number> }>;
  possible_margin_pct: number;
  possible_margin_reason: string;
  retroactive: { months_before_application_month: number; change_on: string; after_change: { adult: number; other: number } };
  apply: { url: string; phone: string; hours: string };
  not_screened: string[];
}

export interface MedicaidPrescreen {
  status: "likely" | "possible" | "unlikely" | "not_applicable";
  group?: "adult" | "pregnant" | "child";
  groupLabel?: string;
  monthlyIncome?: number;
  monthlyLimit?: number;
  pctFpl?: number;
  reason: string;
  coveredBills: { billId: string; applyBy: string }[];
  applyBy?: string;
  childrenMayQualify?: boolean;
}

const ym = (d: Date) => d.getUTCFullYear() * 12 + d.getUTCMonth();
const endOfMonth = (m: number) => new Date(Date.UTC(Math.floor(m / 12), (m % 12) + 1, 0)).toISOString().slice(0, 10);

function fpl(p: MedicaidProgram, size: number) {
  const t = p.fpl_2026.by_household_size;
  return t[String(size)] ?? t["8"] + (size - 8) * p.fpl_2026.each_additional;
}

function monthlyLimit(p: MedicaidProgram, group: "adult" | "pregnant" | "child", size: number) {
  const g = p.groups[group];
  return g.monthly_limit[String(size)] ?? Math.round((fpl(p, size) * g.pct_fpl) / 100 / 12);
}

// Last day you can apply and still have retroactive coverage reach the date of service.
export function applyByDate(p: MedicaidProgram, serviceDate: string, group: "adult" | "pregnant" | "child", today: Date): string | null {
  const service = ym(new Date(serviceDate));
  const change = ym(new Date(p.retroactive.change_on));
  let last: number | null = null;
  for (let app = Math.max(service, ym(today)); app <= service + p.retroactive.months_before_application_month; app++) {
    const retro = app < change ? p.retroactive.months_before_application_month : group === "adult" ? p.retroactive.after_change.adult : p.retroactive.after_change.other;
    if (app - retro <= service) last = app;
  }
  return last == null ? null : endOfMonth(last);
}

// Screens the patient themself; a counselor and Maryland Health Connection make the actual determination.
export function prescreenMedicaid(p: MedicaidProgram, answers: Answers, bills: Bill[], today = new Date(), patientAge?: number): MedicaidPrescreen {
  const none = { coveredBills: [] };
  if (answers.benefits.includes("medicaid")) return { ...none, status: "not_applicable", reason: "You already have Medicaid." };
  if (answers.insured) return { ...none, status: "not_applicable", reason: "You have insurance, so this check is skipped." };
  if (answers.over65 || (patientAge != null && patientAge >= 65)) {
    return { ...none, status: "not_applicable", reason: "People 65 and older use Medicare and different Medicaid programs. A counselor can check those." };
  }

  const group: "adult" | "pregnant" | "child" = patientAge != null && patientAge < 19 ? "child" : answers.pregnant ? "pregnant" : "adult";
  const size = group === "pregnant" ? Math.max(2, answers.householdSize + 1) : answers.householdSize;
  const monthlyIncome = Math.round(answers.annualIncome / 12);
  const limit = monthlyLimit(p, group, size);
  const pctFpl = Math.round((answers.annualIncome / fpl(p, size)) * 100);
  const kidsLimit = monthlyLimit(p, "child", answers.householdSize);
  const childrenMayQualify = Boolean(answers.childrenUnder19) && monthlyIncome <= kidsLimit;
  const base = { group, groupLabel: p.groups[group].label, monthlyIncome, monthlyLimit: limit, pctFpl, childrenMayQualify };

  let status: MedicaidPrescreen["status"];
  let reason: string;
  if (monthlyIncome <= limit) {
    status = "likely";
    reason = `$${monthlyIncome.toLocaleString()} a month is within the $${limit.toLocaleString()} limit for a household of ${size} (${p.groups[group].pct_fpl}% of the poverty level).`;
  } else if (monthlyIncome <= limit * (1 + p.possible_margin_pct / 100)) {
    status = "possible";
    reason = `$${monthlyIncome.toLocaleString()} a month is just above the $${limit.toLocaleString()} limit for a household of ${size}. ${p.possible_margin_reason}`;
  } else {
    return { ...base, ...none, status: "unlikely", reason: `$${monthlyIncome.toLocaleString()} a month is above the $${limit.toLocaleString()} limit for a household of ${size}.` };
  }

  const coveredBills = bills
    .map((b) => ({ billId: b.id, applyBy: b.serviceDate ? applyByDate(p, b.serviceDate, group, today) : null }))
    .filter((b): b is { billId: string; applyBy: string } => b.applyBy != null);
  const applyBy = coveredBills.map((b) => b.applyBy).sort()[0];
  return { ...base, status, reason, coveredBills, applyBy };
}
