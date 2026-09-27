import type { SupabaseClient } from "@supabase/supabase-js";
import type { Patient } from "./demo";
import type { Answers, Bill, DocState, MedicaidScreening, Screening } from "./types";

export type AppStatus = "submitted" | "info_requested" | "responded" | "in_review";

export interface Message {
  from: "counselor" | "patient";
  text: string;
  at: string;
}

export interface InfoRequest {
  docIds: string[];
  message: string;
  at: string;
  dueBy: string;
  resolvedAt?: string;
}

export interface AppEvent {
  type: "submitted" | "info_requested" | "responded" | "in_review";
  at: string;
  missingCount?: number;
}

export interface Application {
  id: string;
  hospitalId: string;
  patient: Patient;
  bills: Bill[];
  answers: Answers;
  docs: Record<string, DocState>;
  medicaidStatus: MedicaidScreening;
  screening: Screening;
  status: AppStatus;
  messages: Message[];
  requests: InfoRequest[];
  events: AppEvent[];
  submittedAt: string;
  updatedAt: string;
  sample?: boolean;
}

// Indexed/filtered fields are real columns; the rest of the application lives in `data` (jsonb).
const COLUMNS = "id, hospital_id, status, sample, data, submitted_at, updated_at";

interface Row {
  id: string;
  hospital_id: string;
  status: AppStatus;
  sample: boolean;
  data: Omit<Application, "id" | "hospitalId" | "status" | "sample" | "submittedAt" | "updatedAt">;
  submitted_at: string;
  updated_at: string;
}

const fromRow = (r: Row): Application => ({
  ...r.data,
  id: r.id,
  hospitalId: r.hospital_id,
  status: r.status,
  sample: r.sample,
  submittedAt: r.submitted_at,
  updatedAt: r.updated_at,
});

const toRow = (a: Application) => {
  const { id, hospitalId, status, sample, submittedAt, updatedAt, ...data } = a;
  return { id, hospital_id: hospitalId, status, sample: Boolean(sample), data, submitted_at: submittedAt, updated_at: updatedAt };
};

function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(`Database error: ${result.error.message}`);
  return result.data;
}

export async function insertApplications(db: SupabaseClient, apps: Application[], accessTokenHash?: string, policyId?: string | null) {
  check(await db.from("applications").insert(apps.map((a) => ({ ...toRow(a), access_token_hash: accessTokenHash ?? null, policy_id: policyId ?? null }))));
}

export async function updateApplication(db: SupabaseClient, app: Application): Promise<Application> {
  const { id, ...row } = toRow(app);
  const data = check(await db.from("applications").update(row).eq("id", id).select(COLUMNS).single());
  return fromRow(data as Row);
}

export async function getApplication(db: SupabaseClient, id: string): Promise<{ app: Application; accessTokenHash: string | null } | null> {
  const data = check(await db.from("applications").select(`${COLUMNS}, access_token_hash`).eq("id", id).maybeSingle());
  if (!data) return null;
  const row = data as Row & { access_token_hash: string | null };
  return { app: fromRow(row), accessTokenHash: row.access_token_hash };
}

export async function listApplications(db: SupabaseClient, hospitalId: string): Promise<Application[]> {
  const data = check(await db.from("applications").select(COLUMNS).eq("hospital_id", hospitalId).order("submitted_at", { ascending: false }));
  return (data as Row[]).map(fromRow);
}

export async function deleteSampleApplications(db: SupabaseClient, hospitalId: string) {
  check(await db.from("applications").delete().eq("hospital_id", hospitalId).eq("sample", true));
}
