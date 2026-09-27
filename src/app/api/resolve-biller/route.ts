import { after } from "next/server";
import { getPolicy } from "@/lib/policies";
import { queueImport, runImport } from "@/lib/importer/run";
import { resolveBiller, type KnownHospital } from "@/lib/resolve";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

// Imports cost API money and are triggered by anonymous patients, so cap new ones per visitor.
const recent = new Map<string, number[]>();
function allowImport(ip: string) {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  recent.set(ip, [...hits, now]);
  return hits.length < 5;
}

export async function POST(request: Request) {
  const bill = await request.json();
  if (typeof bill?.billerName !== "string" || bill.billerName.trim().length < 3) {
    return Response.json({ error: "Missing biller name" }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: rows } = await db.from("hospitals").select("id, name, aliases, status");
  const hospitals: KnownHospital[] = await Promise.all(
    (rows ?? []).map(async (h) => ({ ...h, policy: h.status === "live" ? (await getPolicy(h.id))?.policy : undefined })),
  );

  const match = resolveBiller(bill, hospitals);
  if (match.kind !== "unknown") return Response.json(match);

  // Only institutions that plausibly have a financial assistance policy are worth importing.
  if (bill.billerType && !["hospital", "physician_group"].includes(bill.billerType)) {
    return Response.json({ kind: "unknown", reason: "not_a_hospital" });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allowImport(ip)) return Response.json({ kind: "unknown", reason: "rate_limited" });

  const queued = await queueImport({
    billerName: bill.billerName,
    billerAddress: bill.billerAddress,
    billerState: bill.billerState,
    billerPhone: bill.billerPhone,
    billerWebsite: bill.billerWebsite,
  });
  if (queued.importId) after(() => runImport(queued.importId!));
  return Response.json({ kind: "hospital", hospitalId: queued.hospitalId, hospitalName: bill.billerName, status: "pending" });
}
