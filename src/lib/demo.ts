import data from "../../demo-cases/cases.json";
import type { Answers, Bill, DocState, MedicaidScreening } from "./types";

export interface Patient {
  name: string;
  dob: string;
  address: string;
  phone: string;
}

export interface DemoCase {
  id: string;
  title: string;
  hospital: string;
  patient: Patient;
  story: string;
  bills: (Bill & { file: string })[];
  answers: Answers;
  docs: Record<string, DocState>;
  medicaidStatus: MedicaidScreening;
  demoPoint: string;
}

export const demoCases = data.cases as unknown as DemoCase[];
