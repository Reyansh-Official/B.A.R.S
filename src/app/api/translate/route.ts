import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "node:crypto";

const cache = new Map<string, string>();
const key = (t: string) => createHash("sha256").update(t).digest("base64url");
let client: Anthropic | undefined;

const SYSTEM = `You translate text from a US hospital's financial-assistance screens into clear, plain Spanish for patients (US Spanish, about a 6th-grade reading level, use "usted").
Keep every number, dollar amount, date, percentage, phone number, and proper name exactly as written. Keep program names such as Medicaid, SNAP, WIC, MCHP, W-2, and 1099 in English, adding a short Spanish explanation in parentheses only if the meaning would otherwise be unclear.
Return only a JSON array of strings, one translation per input, in the same order.`;

// Hospital-specific text (policy labels, rule explanations). UI text is translated by hand in the components.
export async function POST(request: Request) {
  const { texts } = (await request.json()) as { texts?: unknown };
  if (!Array.isArray(texts) || texts.length > 60 || texts.some((t) => typeof t !== "string" || t.length > 800)) {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  const todo = [...new Set((texts as string[]).filter((t) => !cache.has(key(t))))];
  if (todo.length) {
    try {
      client ??= new Anthropic();
      const res = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 8000,
        system: SYSTEM,
        messages: [{ role: "user", content: JSON.stringify(todo) }],
      });
      const out = res.content.find((b) => b.type === "text")?.text ?? "[]";
      const parsed = JSON.parse(out.slice(out.indexOf("["), out.lastIndexOf("]") + 1)) as unknown;
      if (Array.isArray(parsed) && parsed.length === todo.length) todo.forEach((t, i) => typeof parsed[i] === "string" && cache.set(key(t), parsed[i]));
    } catch (error) {
      console.error("Translation failed", error instanceof Error ? error.message : error);
    }
  }
  return Response.json({ translations: (texts as string[]).map((t) => cache.get(key(t)) ?? t) });
}
