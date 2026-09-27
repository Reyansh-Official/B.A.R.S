import "server-only";
import { createClient } from "@supabase/supabase-js";
import umms from "../../policies/umms.json";
import type { Policy } from "./types";

export interface LoadedPolicy {
  policy: Policy;
  policyId: string | null;
  version: number;
}

export interface HospitalSummary {
  id: string;
  name: string;
  aliases: string[];
  state: string | null;
  assistancePhone: string | null;
  status: "live" | "pending" | "failed";
}

// Approved policies and live hospitals are public information, so the publishable key is enough.
const publicDb = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
const hasDb = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

const TTL_MS = 60_000;
const cache = new Map<string, { at: number; value: LoadedPolicy | null }>();

export async function getPolicy(hospitalId: string): Promise<LoadedPolicy | null> {
  const hit = cache.get(hospitalId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  let value: LoadedPolicy | null = null;
  if (hasDb()) {
    const { data } = await publicDb().from("policies").select("id, version, data").eq("hospital_id", hospitalId).eq("status", "approved").maybeSingle();
    if (data) value = { policy: data.data as Policy, policyId: data.id, version: data.version };
  } else if (hospitalId === "umms") {
    value = { policy: umms as unknown as Policy, policyId: null, version: 0 };
  }
  cache.set(hospitalId, { at: Date.now(), value });
  return value;
}

export function clearPolicyCache(hospitalId?: string) {
  if (hospitalId) cache.delete(hospitalId);
  else cache.clear();
}

export async function listLiveHospitals(): Promise<HospitalSummary[]> {
  if (!hasDb()) return [{ id: "umms", name: (umms as unknown as Policy).name, aliases: [], state: "MD", assistancePhone: null, status: "live" }];
  const { data } = await publicDb().from("hospitals").select("id, name, aliases, state, assistance_phone, status").eq("status", "live").order("name");
  return (data ?? []).map((h) => ({ id: h.id, name: h.name, aliases: h.aliases, state: h.state, assistancePhone: h.assistance_phone, status: h.status }));
}
