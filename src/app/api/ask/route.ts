import Anthropic from "@anthropic-ai/sdk";
import { askStream, buildMessages, groundingDocuments, type ChatTurn } from "@/lib/ask";
import { getPolicy, getPolicySources } from "@/lib/policies";

export const maxDuration = 60;

// Anonymous patients can ask, so cap questions per visitor and keep inputs short.
const recent = new Map<string, number[]>();
const allow = (ip: string) => {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  recent.set(ip, [...hits, now]);
  return hits.length < 20;
};

export interface AnswerSegment {
  text: string;
  cites: { doc: number; page: number; quote: string }[];
}

export async function POST(request: Request) {
  const body = await request.json();
  const question = String(body?.question ?? "").trim();
  const history: ChatTurn[] = Array.isArray(body?.history) ? body.history.slice(-6) : [];
  if (!question || question.length > 500) return Response.json({ error: "Please ask a shorter question." }, { status: 400 });
  const validHistory = history.every((t, i) => t && (t.role === (i % 2 === 0 ? "user" : "assistant")) && typeof t.content === "string" && t.content.length <= 3000);
  if (!validHistory || history.length % 2 !== 0) return Response.json({ error: "Invalid conversation." }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allow(ip)) return Response.json({ error: "You've asked a lot of questions. Please try again in a little while, or call the financial assistance office." }, { status: 429 });

  const loaded = await getPolicy(String(body?.hospitalId ?? ""));
  if (!loaded) return Response.json({ error: "Unknown hospital" }, { status: 404 });
  const { blocks, docs } = await groundingDocuments(loaded.policy, await getPolicySources(loaded.policy.id));
  const context = String(body?.context ?? "").slice(0, 1500);
  const stream = askStream(loaded.policy, buildMessages(blocks, context, history, question));

  const encoder = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController, event: object) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          stream.on("text", (text) => send(controller, { type: "text", text }));
          const final = await stream.finalMessage();
          const segments: AnswerSegment[] = final.content.flatMap((b) =>
            b.type === "text"
              ? [{
                  text: b.text,
                  cites: (b.citations ?? []).flatMap((c) =>
                    c.type === "page_location" ? [{ doc: c.document_index, page: c.start_page_number, quote: c.cited_text.slice(0, 300) }] : c.type === "char_location" ? [{ doc: c.document_index, page: 0, quote: c.cited_text.slice(0, 300) }] : [],
                  ),
                }]
              : [],
          );
          const u = final.usage;
          console.log(`[ask] ${loaded.policy.id} in=${u.input_tokens} cache_write=${u.cache_creation_input_tokens ?? 0} cache_read=${u.cache_read_input_tokens ?? 0} out=${u.output_tokens}`);
          send(controller, { type: "done", segments, docs });
        } catch (e) {
          const message = e instanceof Anthropic.RateLimitError ? "Too many people are asking right now. Please try again in a moment." : "Sorry, something went wrong. You can call the financial assistance office for help.";
          send(controller, { type: "error", message });
        } finally {
          controller.close();
        }
      },
    }),
    { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } },
  );
}
