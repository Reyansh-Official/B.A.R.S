import { z } from "zod";

const cite = z.string().describe('Where this came from, e.g. "Policy p.3" or "Sliding scale p.1"');

export const PRESUMPTIVE_IDS = ["snap", "wic", "energy", "medicaid", "medicaid_pharmacy", "slmb", "homeless", "bankruptcy", "school_lunch", "pac"] as const;
export const DOC_IDS = ["income_proof", "tax_return", "unemployment_proof", "benefit_income", "housing", "medicaid_letter", "signature", "spouse_signature"] as const;
export const APPLIES_WHEN = ["always", "employed", "self_employed", "unemployed", "has_benefit_income", "applied_for_medicaid", "married"] as const;

// What Claude extracts from a hospital's published policy documents. Code (build.ts) turns it into
// the rules-engine format and validate.ts checks it; nothing here is trusted without review.
export const ExtractedPolicy = z.object({
  isFinancialAssistancePolicy: z.boolean().describe("False if the documents are not a hospital financial assistance / charity care policy"),
  hospitalSystemName: z.string(),
  facilities: z.array(z.object({ name: z.string(), aliases: z.array(z.string()) })).describe("Every hospital/facility the policy applies to, with names as they appear on bills"),
  policyTitle: z.string(),
  effectiveDate: z.string().nullable().describe("Revision or effective date as YYYY-MM-DD"),
  income: z.object({
    basis: z.enum(["fpl", "other"]).describe("fpl if thresholds are stated as % of the federal poverty level/guidelines"),
    basisNote: z.string().describe("How income limits are defined, in one sentence"),
    bands: z
      .array(z.object({ maxPctFpl: z.number().describe("Upper income limit of this band as % of FPL, e.g. 200"), discountPct: z.number().describe("Discount off the patient balance, 100 = free") }))
      .describe("Discount bands from lowest to highest income"),
    aboveTopBandDiscountPct: z.number(),
    explicitTable: z
      .array(z.object({ householdSize: z.number(), upperBounds: z.array(z.number()).describe("Annual dollar upper limit of each band, same order as bands") }))
      .describe("Dollar table by household size if the documents publish one, otherwise empty"),
    source: cite,
  }),
  hardship: z.object({ exists: z.boolean(), debtPctOfIncome: z.number().nullable(), incomeBelowPctFpl: z.number().nullable(), rule: z.string(), source: cite }),
  presumptive: z.object({
    programs: z.array(z.object({ id: z.enum(PRESUMPTIVE_IDS).nullable().describe("Closest known id, or null if none fits"), label: z.string() })),
    result: z.string(),
    source: cite,
  }),
  documents: z.array(
    z.object({
      id: z.enum(DOC_IDS).nullable().describe("Closest known document id, or null"),
      label: z.string(),
      appliesWhen: z.enum(APPLIES_WHEN),
      alternatives: z.array(z.string()).describe("Other documents the policy accepts instead"),
      source: cite,
    }),
  ),
  notCoveredBillers: z
    .array(z.object({ name: z.string(), aliases: z.array(z.string()), nextStep: z.string(), phone: z.string().nullable(), source: cite }))
    .describe("Named physician groups or providers whose charges the policy does NOT cover"),
  exclusions: z.array(z.string()),
  timelines: z.object({
    applicationWindowDays: z.number().nullable(),
    finalDeterminationDays: z.number().nullable(),
    missingInfoResponseDays: z.number().nullable(),
    source: cite,
  }),
  contact: z.object({ phone: z.string().nullable(), email: z.string().nullable(), fax: z.string().nullable(), mail: z.string().nullable(), hours: z.string().nullable() }),
  uncertain: z.array(z.string()).describe("Anything ambiguous, missing, or that needs a human to check"),
});
export type ExtractedPolicy = z.infer<typeof ExtractedPolicy>;

// One schema is too large to enforce in a single structured-output call, so extraction runs as three parts.
export const ExtractCore = ExtractedPolicy.pick({ isFinancialAssistancePolicy: true, hospitalSystemName: true, facilities: true, policyTitle: true, effectiveDate: true, timelines: true, contact: true, uncertain: true });
export const ExtractEligibility = ExtractedPolicy.pick({ income: true, hardship: true, presumptive: true, uncertain: true });
export const ExtractPaperwork = ExtractedPolicy.pick({ documents: true, notCoveredBillers: true, exclusions: true, uncertain: true });

export const DiscoveredDocuments = z.object({
  found: z.boolean(),
  officialName: z.string(),
  aliases: z.array(z.string()).describe("Other names this institution uses on bills"),
  state: z.string().nullable(),
  website: z.string().nullable(),
  assistancePhone: z.string().nullable(),
  documents: z.array(
    z.object({
      kind: z.enum(["policy", "plain_language_summary", "application", "sliding_scale", "provider_list", "other"]),
      url: z.string(),
      title: z.string(),
    }),
  ),
  notes: z.string(),
});
export type DiscoveredDocuments = z.infer<typeof DiscoveredDocuments>;
