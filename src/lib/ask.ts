import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { DocumentBlockParam, MessageParam } from "@anthropic-ai/sdk/resources/messages/messages";
import type { PolicySource } from "./policies";
import type { Policy } from "./types";

let client: Anthropic | undefined;
const claude = () => (client ??= new Anthropic());

// Policy PDFs rarely change, so keep downloaded copies in memory (per server process).
const pdfCache = new Map<string, { at: number; data: string | null }>();
const PDF_TTL_MS = 6 * 3_600_000;
const MAX_PDF_BYTES = 8 * 1024 * 1024;

async function loadPdf(url: string): Promise<string | null> {
  const hit = pdfCache.get(url);
  if (hit && Date.now() - hit.at < PDF_TTL_MS) return hit.data;
  let data: string | null = null;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20_000),
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36" },
    });
    const bytes = Buffer.from(await res.arrayBuffer());
    if (res.ok && bytes.length <= MAX_PDF_BYTES && bytes.subarray(0, 4).toString() === "%PDF") data = bytes.toString("base64");
  } catch {
    data = null;
  }
  pdfCache.set(url, { at: Date.now(), data });
  return data;
}

export interface GroundingDoc {
  title: string;
  url: string;
}

// The hospital's own published documents are what answers are grounded in and cited from.
export async function groundingDocuments(policy: Policy, sources: PolicySource[]): Promise<{ blocks: DocumentBlockParam[]; docs: GroundingDoc[] }> {
  const wanted = ["policy", "plain_language_summary"];
  const picked = sources.filter((s) => wanted.includes(s.kind)).slice(0, 2);
  const blocks: DocumentBlockParam[] = [];
  const docs: GroundingDoc[] = [];
  for (const s of picked) {
    const data = await loadPdf(s.url);
    if (!data) continue;
    const title = s.kind === "policy" ? `${policy.name} financial assistance policy` : `${policy.name} patient information sheet`;
    blocks.push({ type: "document", title, source: { type: "base64", media_type: "application/pdf", data }, citations: { enabled: true } });
    docs.push({ title, url: s.url });
  }
  // If the PDF can't be downloaded, fall back to the reviewed rules so answers still have a source.
  if (!blocks.length) {
    const title = `${policy.name} financial assistance rules (reviewed summary)`;
    blocks.push({ type: "document", title, source: { type: "text", media_type: "text/plain", data: summarizePolicy(policy) }, citations: { enabled: true } });
    docs.push({ title, url: policy.policy.url });
  }
  blocks[blocks.length - 1] = { ...blocks[blocks.length - 1], cache_control: { type: "ephemeral" } };
  return { blocks, docs };
}

function summarizePolicy(p: Policy): string {
  const r = p.income_rules;
  return [
    `${p.policy.title} (revised ${p.policy.revision}).`,
    `Income bands: ${r.bands_pct_of_mdh.map((pct, i) => `up to ${pct}% of the ${r.limit_label ?? "income limit"}: ${r.band_discounts_pct[i]}% off`).join("; ")}.`,
    `Financial hardship: ${p.financial_hardship.rule}`,
    `Automatic eligibility: ${p.presumptive_eligibility.qualifying.map((q) => q.label).join(", ")}. ${p.presumptive_eligibility.result}`,
    `Not covered: ${p.not_covered_billers.map((b) => `${b.name} (${b.next_step})`).join("; ") || "none named"}.`,
    `Documents: ${p.documents.map((d) => `${d.label}${d.alternatives.length ? ` (or ${d.alternatives.map((a) => a.label).join(", ")})` : ""}`).join("; ")}.`,
    `Timelines: apply within ${p.timelines.application_window_days} days of the first bill; final decision within ${p.timelines.final_determination_days} days of a complete application; ${p.timelines.missing_info_response_days} days to send missing information.`,
    `Contact: ${p.contact.phone}.`,
  ].join("\n");
}

export function systemPrompt(policy: Policy) {
  return `You help patients understand ${policy.name}'s financial assistance program, inside an app called B.A.R.S.

Rules:
- Answer only from the attached hospital documents, and cite them in every answer, including follow-up questions. If they don't cover the question, say so plainly and suggest calling the financial assistance office at ${policy.contact.phone}.
- You explain; you never decide. Don't promise approval, discounts, or amounts. The app's screening and a financial counselor make those determinations.
- Reply in the language the patient writes in.
- Don't give legal or medical advice, and don't ask for personal details like Social Security numbers.

Style (important):
- Never copy sentences from the documents. Restate each point in everyday words at about a 6th-grade reading level; the citation already links to the exact page.
- No policy jargon: say "income limit" (not FPL), "collection actions like lawsuits or credit reporting" (not ECAs), "your application" (not the patient's application).
- At most 3 short bullet points or 90 words. Lead with the direct answer.

Example of the right tone:
Q: Can they send my bill to collections while I apply?
A: No. While your application is being reviewed, the hospital pauses billing and collections.
- They also can't start collection actions (like reporting to credit bureaus or suing) until at least 180 days after your first bill, and they must warn you in writing 45 days before.
- If you get a collections notice anyway, call ${policy.contact.phone}.`;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export function buildMessages(blocks: DocumentBlockParam[], context: string, history: ChatTurn[], question: string): MessageParam[] {
  const first: MessageParam = {
    role: "user",
    content: [...blocks, { type: "text", text: `What the app knows about my situation (for context only): ${context}\n\n${history[0]?.content ?? question}` }],
  };
  if (!history.length) return [first];
  // Follow-ups tend to be answered from the conversation alone; the reminder keeps answers cited to the documents.
  return [first, ...history.slice(1).map((t) => ({ role: t.role, content: t.content }) as MessageParam), { role: "user", content: `${question}\n\n(Answer from the hospital documents, with citations.)` }];
}

export const askStream = (policy: Policy, messages: MessageParam[]) =>
  claude().messages.stream({
    model: "claude-sonnet-5",
    max_tokens: 800,
    output_config: { effort: "low" },
    system: systemPrompt(policy),
    messages,
  });
