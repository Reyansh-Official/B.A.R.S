import Anthropic from "@anthropic-ai/sdk";
import { evaluate, readDocument } from "@/lib/check-document";
import type { BillFile } from "@/lib/extract";

const allowed = new Set<BillFile["mediaType"]>(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const docId = String(form.get("docId") ?? "");
  const statedIncome = Number(form.get("statedIncome") ?? 0);
  if (!(file instanceof File) || !allowed.has(file.type as BillFile["mediaType"])) {
    return Response.json({ error: "Unsupported file" }, { status: 415 });
  }
  if (file.size > 10 * 1024 * 1024) return Response.json({ error: "File too large" }, { status: 413 });

  try {
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    const doc = await readDocument({ data, mediaType: file.type as BillFile["mediaType"] });
    if (!doc) return Response.json({ error: "Couldn't check this file" }, { status: 422 });
    return Response.json(evaluate(doc, { docId, fileName: file.name, statedIncome }));
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error(`Anthropic API error ${error.status}:`, error.message);
      return Response.json({ error: "Couldn't check this file" }, { status: 502 });
    }
    throw error;
  }
}
