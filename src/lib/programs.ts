import mdMedicaid from "../../policies/programs/md-medicaid.json";
import type { MedicaidProgram } from "./medicaid";

export const medicaidProgram = mdMedicaid as unknown as MedicaidProgram;

export function ageFromDob(dob: string, today = new Date()): number | undefined {
  if (!dob) return undefined;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return undefined;
  let age = today.getUTCFullYear() - d.getUTCFullYear();
  if (today.getUTCMonth() < d.getUTCMonth() || (today.getUTCMonth() === d.getUTCMonth() && today.getUTCDate() < d.getUTCDate())) age--;
  return age;
}
