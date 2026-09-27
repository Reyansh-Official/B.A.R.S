import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaContentBlockParam, BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { z } from "zod";
import { DiscoveredDocuments, ExtractCore, ExtractEligibility, ExtractPaperwork, type ExtractedPolicy } from "./schema";

let client: Anthropic | undefined;
const claude = () => (client ??= new Anthropic());

export interface BillerQuery {
  billerName: string;
  billerAddress?: string;
  billerState?: string;
  billerPhone?: string;
  billerWebsite?: string;
}

// Web search + fetch run on Anthropic's servers; long searches can pause, so resume until done.
export async function discoverDocuments(q: BillerQuery): Promise<DiscoveredDocuments> {
  const messages: BetaMessageParam[] = [
    {
      role: "user",
      content: `Find the current, official financial assistance (charity care) policy documents for this institution, which sent a patient a bill:

Name on bill: ${q.billerName}
Address: ${q.billerAddress ?? "unknown"}
State: ${q.billerState ?? "unknown"}
Phone: ${q.billerPhone ?? "unknown"}
Website: ${q.billerWebsite ?? "unknown"}

Nonprofit hospitals must publish their financial assistance policy, a plain-language summary, the application, and a list of providers the policy does not cover. Maryland hospitals' policies are also posted by the state HSCRC. Prefer the institution's own website. Return direct links (PDF preferred) only for documents you actually found in search results or fetched. If this is not a hospital, or you cannot find a policy, set found to false and explain in notes.`,
    },
  ];

  for (let turn = 0; turn < 6; turn++) {
    const response = await claude().beta.messages.parse({
      model: "claude-opus-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      tools: [
        { type: "web_search_20260209", name: "web_search", max_uses: 8 },
        { type: "web_fetch_20260209", name: "web_fetch", max_uses: 6 },
      ],
      output_config: { effort: "medium", format: betaZodOutputFormat(DiscoveredDocuments) },
      messages,
    });
    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content as BetaContentBlockParam[] });
      continue;
    }
    if (response.stop_reason === "refusal" || !response.parsed_output) throw new Error(`Document search ended without a result (${response.stop_reason})`);
    return response.parsed_output;
  }
  throw new Error("Document search did not finish");
}

export interface FetchedDocument {
  kind: string;
  url: string;
  title: string;
  block: BetaContentBlockParam;
}

const MAX_BYTES = 20 * 1024 * 1024;

// Downloads each document; PDFs go to Claude as PDFs, web pages as plain text.
export async function downloadDocuments(docs: DiscoveredDocuments["documents"], log: (m: string) => Promise<void>): Promise<FetchedDocument[]> {
  const out: FetchedDocument[] = [];
  for (const d of docs.slice(0, 5)) {
    try {
      const res = await fetch(d.url, { signal: AbortSignal.timeout(25_000), headers: { "User-Agent": "CareClear policy importer" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.length > MAX_BYTES) throw new Error("file too large");
      const isPdf = (res.headers.get("content-type") ?? "").includes("pdf") || bytes.subarray(0, 4).toString() === "%PDF";
      const block: BetaContentBlockParam = isPdf
        ? { type: "document", title: `${d.kind}: ${d.title}`, source: { type: "base64", media_type: "application/pdf", data: bytes.toString("base64") } }
        : {
            type: "document",
            title: `${d.kind}: ${d.title}`,
            source: { type: "text", media_type: "text/plain", data: htmlToText(bytes.toString("utf8")).slice(0, 200_000) },
          };
      out.push({ kind: d.kind, url: d.url, title: d.title, block });
      await log(`Downloaded ${d.kind} (${isPdf ? "PDF" : "web page"}, ${Math.round(bytes.length / 1024)} KB): ${d.url}`);
    } catch (e) {
      await log(`Couldn't download ${d.kind} from ${d.url}: ${(e as Error).message}`);
    }
  }
  return out;
}

function htmlToText(html: string) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

const EXTRACT_RULES = `These are a hospital's published financial assistance documents. Extract the policy exactly as written.

- Copy numbers exactly. Income bands must come from the policy or its sliding scale, lowest income first.
- If thresholds are percentages of the federal poverty level, use basis "fpl". If they use another measure (e.g. a state income limit), use "other" and explain.
- Only list a dollar table if the documents print one.
- Cite the document and page for every section.
- notCoveredBillers: only groups the documents explicitly say are not covered.
- Put anything ambiguous, missing, or contradictory in "uncertain" instead of guessing. A person will review everything before patients see it.`;

// Streams because a policy read can run long; finalMessage() still returns the parsed result.
async function extractPart<T extends z.ZodType>(docs: FetchedDocument[], schema: T, focus: string): Promise<z.infer<T>> {
  const blocks = docs.map((d, i) => (i === docs.length - 1 ? { ...d.block, cache_control: { type: "ephemeral" as const } } : d.block));
  const stream = claude().beta.messages.stream({
    model: "claude-opus-5",
    max_tokens: 32000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "high", format: betaZodOutputFormat(schema) },
    messages: [{ role: "user", content: [...(blocks as BetaContentBlockParam[]), { type: "text", text: `${EXTRACT_RULES}\n\nThis pass: extract only ${focus}.` }] }],
  });
  const response = await stream.finalMessage();
  if (response.stop_reason === "refusal" || !response.parsed_output) throw new Error(`Extraction (${focus}) ended without a result (${response.stop_reason})`);
  return response.parsed_output as z.infer<T>;
}

// The first pass writes the document cache; the other two read it in parallel.
export async function extractPolicy(docs: FetchedDocument[]): Promise<ExtractedPolicy> {
  const core = await extractPart(docs, ExtractCore, "the institution, its facilities, the policy title and date, timelines, and contact details");
  const [eligibility, paperwork] = await Promise.all([
    extractPart(docs, ExtractEligibility, "income eligibility bands and discounts, financial hardship rules, and presumptive eligibility programs"),
    extractPart(docs, ExtractPaperwork, "required application documents and accepted alternatives, providers not covered, and service exclusions"),
  ]);
  return { ...core, ...eligibility, ...paperwork, uncertain: [...core.uncertain, ...eligibility.uncertain, ...paperwork.uncertain] };
}
