import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaContentBlockParam, BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { z } from "zod";
import { DiscoveredDocuments, ExtractedPolicy } from "./schema";

let client: Anthropic | undefined;
const claude = () => (client ??= new Anthropic());

// USD per million tokens, from platform.claude.com/docs/en/about-claude/pricing (checked 2026-09-27).
const PRICES = {
  "claude-opus-5": { input: 5, cacheWrite: 6.25, cacheRead: 0.5, output: 25 },
  "claude-sonnet-5": { input: 2, cacheWrite: 2.5, cacheRead: 0.2, output: 10 },
} as const;
const WEB_SEARCH_USD = 10 / 1000;
type Model = keyof typeof PRICES;

export interface CallUsage {
  step: string;
  model: Model;
  input: number;
  cacheWrite: number;
  cacheRead: number;
  output: number;
  searches: number;
  usd: number;
}

type RawUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  server_tool_use?: { web_search_requests?: number | null } | null;
};

function measure(step: string, model: Model, u: RawUsage): CallUsage {
  const p = PRICES[model];
  const c = { input: u.input_tokens, cacheWrite: u.cache_creation_input_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0, output: u.output_tokens, searches: u.server_tool_use?.web_search_requests ?? 0 };
  const usd = (c.input * p.input + c.cacheWrite * p.cacheWrite + c.cacheRead * p.cacheRead + c.output * p.output) / 1e6 + c.searches * WEB_SEARCH_USD;
  return { step, model, ...c, usd: Math.round(usd * 10000) / 10000 };
}

export interface BillerQuery {
  billerName: string;
  billerAddress?: string;
  billerState?: string;
  billerPhone?: string;
  billerWebsite?: string;
}

// Web search + fetch run on Anthropic's servers; long searches can pause, so resume until done.
// Finding documents is a search task, so it runs on Sonnet 5 (about 40% of Opus 5 per token).
export async function discoverDocuments(q: BillerQuery, usage: CallUsage[]): Promise<DiscoveredDocuments> {
  const messages: BetaMessageParam[] = [
    {
      role: "user",
      content: `Find the current, official financial assistance (charity care) policy documents for this institution, which sent a patient a bill:

Name on bill: ${q.billerName}
Address: ${q.billerAddress ?? "unknown"}
State: ${q.billerState ?? "unknown"}
Phone: ${q.billerPhone ?? "unknown"}
Website: ${q.billerWebsite ?? "unknown"}

Nonprofit hospitals must publish their financial assistance policy, a plain-language summary, the application, and a list of providers the policy does not cover. Maryland hospitals' policies are also posted by the state HSCRC. Prefer the institution's own website. Return direct links (PDF preferred) only for documents that appear in your search results. If this is not a hospital, or you cannot find a policy, set found to false and explain in notes.`,
    },
  ];

  for (let turn = 0; turn < 6; turn++) {
    const response = await claude().beta.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 16000,
      // Search only: fetched pages were most of this step's tokens, and the importer downloads the documents itself.
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 4 }],
      output_config: { effort: "medium", format: betaZodOutputFormat(DiscoveredDocuments) },
      messages,
    });
    usage.push(measure(`discover ${turn + 1}`, "claude-sonnet-5", response.usage));
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
// Provider lists over this size name hundreds of individual clinicians (a 500 KB PDF is roughly
// 125k tokens). They rarely change the rules, so they're skipped; short group lists are kept.
const MAX_PROVIDER_LIST_BYTES = 300 * 1024;

// Downloads each document; PDFs go to Claude as PDFs, web pages as plain text.
export async function downloadDocuments(docs: DiscoveredDocuments["documents"], log: (m: string) => Promise<void>): Promise<FetchedDocument[]> {
  const out: FetchedDocument[] = [];
  for (const d of docs.slice(0, 5)) {
    try {
      // Some hospital sites refuse unfamiliar clients, so identify as a regular browser.
      const res = await fetch(d.url, {
        signal: AbortSignal.timeout(25_000),
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36", Accept: "application/pdf,text/html;q=0.9,*/*;q=0.8" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.length > MAX_BYTES) throw new Error("file too large");
      if (d.kind === "provider_list" && bytes.length > MAX_PROVIDER_LIST_BYTES) {
        await log(`Skipped provider list (${Math.round(bytes.length / 1024)} KB, likely individual clinicians; a reviewer can check it at the link): ${d.url}`);
        continue;
      }
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

const SCHEMA_TEXT = JSON.stringify(z.toJSONSchema(ExtractedPolicy));

async function readJson(content: BetaContentBlockParam[], step: string, effort: "medium" | "high", usage: CallUsage[]): Promise<unknown> {
  const stream = claude().beta.messages.stream({
    model: "claude-opus-5",
    max_tokens: 32000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort },
    messages: [{ role: "user", content }],
  });
  const response = await stream.finalMessage();
  usage.push(measure(step, "claude-opus-5", response.usage));
  if (response.stop_reason === "refusal") throw new Error(`${step} was refused`);
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  try {
    return JSON.parse(json);
  } catch {
    return { __unparseable: text.slice(0, 20_000) };
  }
}

// One read of the documents (the full schema is too large to enforce as a structured output, and
// three separate structured reads couldn't share a cache). The result is validated with zod, and a
// cheap follow-up without the documents repairs it if needed.
export async function extractPolicy(docs: FetchedDocument[], usage: CallUsage[]): Promise<ExtractedPolicy> {
  const first = await readJson(
    [...docs.map((d) => d.block), { type: "text", text: `${EXTRACT_RULES}\n\nRespond with only a JSON object matching this JSON Schema:\n${SCHEMA_TEXT}` }],
    "extract policy",
    "high",
    usage,
  );
  const parsed = ExtractedPolicy.safeParse(first);
  if (parsed.success) return parsed.data;

  const repaired = await readJson(
    [{ type: "text", text: `Fix this JSON so it matches the schema. Keep every value that's already valid; don't invent new facts (use null or empty arrays, and add a note to "uncertain").\n\nSchema:\n${SCHEMA_TEXT}\n\nProblems:\n${parsed.error.issues.slice(0, 30).map((i) => `${i.path.join(".")}: ${i.message}`).join("\n")}\n\nJSON:\n${JSON.stringify(first).slice(0, 60_000)}\n\nRespond with only the corrected JSON object.` }],
    "repair json",
    "medium",
    usage,
  );
  const fixed = ExtractedPolicy.safeParse(repaired);
  if (!fixed.success) throw new Error(`Extraction didn't match the policy format: ${fixed.error.issues.slice(0, 3).map((i) => i.path.join(".")).join(", ")}`);
  return fixed.data;
}
