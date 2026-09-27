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
  submittedAt: string;
  updatedAt: string;
}

// In-memory for local dev; swap for Supabase so the phone and laptop share data when deployed.
const globalStore = globalThis as unknown as { __careclear?: Map<string, Application> };
const applications = (globalStore.__careclear ??= new Map());

export function saveApplication(app: Application): Application {
  applications.set(app.id, app);
  return app;
}

export function getApplication(id: string): Application | undefined {
  return applications.get(id);
}

export function listApplications(): Application[] {
  return [...applications.values()].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}
