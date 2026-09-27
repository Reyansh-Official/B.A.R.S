import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { BillFile } from "./extract";
import type { DocCheck } from "./types";

const DocumentTypes = [
  "pay_stub", "w2", "form_1099", "tax_return", "unemployment_statement", "benefit_letter", "bank_statement",
  "employer_letter", "support_letter", "lease_or_rent_bill", "mortgage_statement", "property_tax_statement",
  "medicaid_letter", "medical_bill", "other",
] as const;
type DocumentType = (typeof DocumentTypes)[number];

const ReadDocument = z.object({
  readable: z.boolean().describe("False if the image is too blurry, cut off, or blank to read"),
  documentType: z.enum(DocumentTypes),
  personName: z.string().nullable().describe("Person the document is about (employee, claimant, taxpayer, tenant)"),
  issuer: z.string().nullable().describe("Employer, agency, bank, or landlord that issued it"),
  documentDate: z.string().nullable().describe("Most relevant date (pay date, notice date, statement date) as YYYY-MM-DD"),
  taxYear: z.number().nullable(),
  amount: z.number().nullable().describe("Gross income amount: gross pay this period, weekly benefit, wages or AGI on a tax form, or rent due"),
  frequency: z.enum(["weekly", "biweekly", "semimonthly", "monthly", "yearly"]).nullable().describe("How often the amount is paid"),
  address: z.string().nullable(),
});
type ReadDocument = z.infer<typeof ReadDocument>;

const label: Record<DocumentType, string> = {
  pay_stub: "pay stub", w2: "W-2", form_1099: "1099", tax_return: "tax return", unemployment_statement: "unemployment benefits statement",
  benefit_letter: "benefits letter", bank_statement: "bank statement", employer_letter: "employer letter", support_letter: "letter of support",
  lease_or_rent_bill: "lease or rent bill", mortgage_statement: "mortgage statement", property_tax_statement: "property tax statement",
  medicaid_letter: "Medicaid letter", medical_bill: "medical bill", other: "document",
};

// Document types the policy accepts for each requirement (including its listed alternatives).
const accepted: Record<string, DocumentType[]> = {
  income_proof: ["pay_stub", "w2", "tax_return", "bank_statement", "employer_letter", "benefit_letter"],
  tax_return: ["tax_return", "form_1099", "bank_statement"],
  unemployment_proof: ["unemployment_statement", "support_letter", "benefit_letter"],
  benefit_income: ["benefit_letter", "bank_statement"],
  housing: ["lease_or_rent_bill", "mortgage_statement", "property_tax_statement"],
  medicaid_letter: ["medicaid_letter"],
};
const incomeTypes: DocumentType[] = ["pay_stub", "w2", "tax_return", "form_1099", "unemployment_statement", "benefit_letter"];
const recencyTypes: DocumentType[] = ["pay_stub", "unemployment_statement", "bank_statement", "benefit_letter"];
const periodsPerYear = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12, yearly: 1 } as const;

let client: Anthropic | undefined;

export async function readDocument(file: BillFile): Promise<ReadDocument | null> {
  const source =
    file.mediaType === "application/pdf"
      ? ({ type: "document", source: { type: "base64", media_type: file.mediaType, data: file.data } } as const)
      : ({ type: "image", source: { type: "base64", media_type: file.mediaType, data: file.data } } as const);
  client ??= new Anthropic();
  const response = await client.beta.messages.parse({
    model: "claude-opus-5",
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(ReadDocument) },
    messages: [
      {
        role: "user",
        content: [
          source,
          { type: "text", text: "A patient uploaded this as supporting paperwork for a hospital financial-assistance application. Identify what it is and copy the key facts exactly as printed. Use null for anything not shown." },
        ],
      },
    ],
  });
  if (response.stop_reason === "refusal") return null;
  return response.parsed_output;
}

export interface CheckContext {
  docId: string;
  fileName: string;
  statedIncome: number;
  today?: Date;
}

// The model only reads; every judgment below is deterministic and advisory (it never changes eligibility or readiness).
export function evaluate(doc: ReadDocument, ctx: CheckContext): DocCheck {
  const base = { fileName: ctx.fileName, documentType: doc.documentType };
  if (!doc.readable) {
    return { ...base, verdict: "unreadable", summary: "We couldn't read this file", details: ["Try a clearer, well-lit photo with all four corners showing."] };
  }

  const parts = [label[doc.documentType][0].toUpperCase() + label[doc.documentType].slice(1), doc.personName, doc.issuer].filter(Boolean);
  let annualized: number | undefined;
  if (incomeTypes.includes(doc.documentType) && doc.amount != null) {
    annualized = Math.round(doc.amount * periodsPerYear[doc.frequency ?? "yearly"]);
    parts.push(doc.frequency && doc.frequency !== "yearly" ? `$${doc.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${doc.frequency} (about $${annualized.toLocaleString()}/yr)` : `$${annualized.toLocaleString()}/yr`);
  }
  if (doc.documentDate) parts.push(doc.documentDate);
  const summary = parts.join(" · ");

  const allowed = accepted[ctx.docId];
  if (allowed && !allowed.includes(doc.documentType)) {
    return {
      ...base,
      verdict: "wrong_type",
      summary,
      details: [`This looks like a ${label[doc.documentType]}, which doesn't match what's needed here.`],
    };
  }

  const details: string[] = [];
  let verdict: DocCheck["verdict"] = "ok";
  const today = ctx.today ?? new Date();

  if (recencyTypes.includes(doc.documentType) && doc.documentDate) {
    const ageDays = (today.getTime() - new Date(doc.documentDate).getTime()) / 86_400_000;
    if (ageDays > 120) {
      verdict = "warn";
      details.push(`This is dated ${doc.documentDate}. The hospital asks for your most recent one.`);
    }
  }

  // One earner can't out-earn the whole household; lower is expected when others also work.
  if (annualized != null && ctx.statedIncome > 0 && annualized > ctx.statedIncome * 1.1 && annualized - ctx.statedIncome > 2000) {
    verdict = "warn";
    details.push(`This shows about $${annualized.toLocaleString()} a year, more than the $${ctx.statedIncome.toLocaleString()} household income you entered.`);
    return { ...base, verdict, summary, details, annualizedIncome: annualized, suggestedIncome: annualized };
  }

  if (verdict === "ok") details.push("Matches what the hospital asked for.");
  return { ...base, verdict, summary, details, annualizedIncome: annualized };
}
