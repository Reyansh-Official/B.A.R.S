import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

export interface Counselor {
  userId: string;
  email: string;
  hospitalId: string;
}

// A valid Supabase login is not enough: the account must also have a row in public.counselors.
export async function getCounselor(): Promise<Counselor | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const { data: row } = await supabase.from("counselors").select("hospital_id").eq("user_id", claims.sub).maybeSingle();
  return row ? { userId: claims.sub, email: String(claims.email ?? ""), hospitalId: row.hospital_id } : null;
}

export async function requireCounselor(from = "/counselor"): Promise<Counselor> {
  const counselor = await getCounselor();
  if (!counselor) redirect(`/login?next=${encodeURIComponent(from)}`);
  return counselor;
}
