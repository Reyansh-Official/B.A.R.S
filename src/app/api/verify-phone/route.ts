import { checkCode, startVerification } from "@/lib/phone-verify";

type Body = ({ action: "start"; phone: string } | { action: "check"; id: string; code: string }) & { lang?: string };

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  const lang = body.lang === "es" ? "es" : "en";
  if (body.action === "start") {
    const result = await startVerification(String(body.phone ?? ""), lang);
    return Response.json(result, { status: result.ok ? 200 : 400 });
  }
  if (body.action === "check") {
    const result = await checkCode(String(body.id ?? ""), String(body.code ?? ""), lang);
    return Response.json(result, { status: result.ok ? 200 : 400 });
  }
  return Response.json({ error: "Unknown action" }, { status: 400 });
}
