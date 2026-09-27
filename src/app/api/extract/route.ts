import Anthropic from "@anthropic-ai/sdk";
import { extractBill, type BillFile } from "@/lib/extract";

const allowed = new Set<BillFile["mediaType"]>(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file uploaded." }, { status: 400 });
  if (!allowed.has(file.type as BillFile["mediaType"])) {
    return Response.json({ error: "Please upload a photo (JPG, PNG) or a PDF." }, { status: 415 });
  }
  if (file.size > MAX_BYTES) return Response.json({ error: "That file is too large (max 10 MB)." }, { status: 413 });

  try {
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    const result = await extractBill({ data, mediaType: file.type as BillFile["mediaType"] });
    if ("refused" in result) {
      return Response.json({ error: "We couldn't read this bill. You can type the details in instead." }, { status: 422 });
    }
    if (!result.isMedicalBill) {
      return Response.json({ error: "This doesn't look like a medical bill. Try another photo or file." }, { status: 422 });
    }
    return Response.json(result);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("Anthropic API key missing or invalid");
      return Response.json({ error: "Bill reading isn't set up yet. You can type the details in instead." }, { status: 500 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Too many requests right now. Please try again in a moment." }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Anthropic API error ${error.status}:`, error.message);
      return Response.json({ error: "We couldn't read this bill. You can type the details in instead." }, { status: 502 });
    }
    throw error;
  }
}
