import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

export const ExtractedBill = z.object({
  isMedicalBill: z.boolean().describe("False if this is not a medical bill or statement"),
  billerName: z.string().nullable().describe("Organization that sent the bill, exactly as printed"),
  billerPhone: z.string().nullable(),
  billerAddress: z.string().nullable().describe("Biller's mailing address on one line"),
  billerState: z.string().nullable().describe("Two-letter US state of the biller, e.g. MD"),
  billerWebsite: z.string().nullable(),
  billerType: z
    .enum(["hospital", "physician_group", "lab", "imaging", "ambulance", "other"])
    .describe("hospital = facility charges; physician_group = professional fees from doctors"),
  accountNumber: z.string().nullable(),
  patientName: z.string().nullable(),
  patientAddress: z.string().nullable().describe("Patient mailing address on one line"),
  serviceDate: z.string().nullable().describe("Date of service as YYYY-MM-DD"),
  statementDate: z.string().nullable().describe("Statement date as YYYY-MM-DD"),
  amountOwed: z.number().nullable().describe("Amount the patient currently owes, after insurance"),
  totalCharges: z.number().nullable(),
  insuranceMentioned: z.boolean(),
  uncertainFields: z.array(z.string()).describe("Names of fields above that were unclear, cut off, or guessed"),
});
export type ExtractedBill = z.infer<typeof ExtractedBill>;

const PROMPT = `Read this patient's bill and fill in the fields. Copy names and numbers exactly as printed; use null for anything not shown. Hospital and physician bills often come from different organizations, so report the organization that issued this specific bill. The patient will review and correct every field, so list any field you are unsure about in uncertainFields rather than guessing silently.`;

const client = new Anthropic();

export type BillFile = { data: string; mediaType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp" | "image/gif" };

export async function extractBill(file: BillFile): Promise<ExtractedBill | { refused: true }> {
  const source =
    file.mediaType === "application/pdf"
      ? ({ type: "document", source: { type: "base64", media_type: file.mediaType, data: file.data } } as const)
      : ({ type: "image", source: { type: "base64", media_type: file.mediaType, data: file.data } } as const);

  const response = await client.beta.messages.parse({
    model: "claude-opus-5",
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(ExtractedBill) },
    messages: [{ role: "user", content: [source, { type: "text", text: PROMPT }] }],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) return { refused: true };
  return response.parsed_output;
}
