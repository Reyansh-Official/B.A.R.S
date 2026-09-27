import umms from "../../policies/umms.json";
import type { Policy } from "./types";

// Adding a hospital = adding its verified policy file here.
const policies: Record<string, Policy> = {
  umms: umms as unknown as Policy,
};

export function getPolicy(id: string): Policy | undefined {
  return policies[id];
}

export function listPolicies(): Policy[] {
  return Object.values(policies);
}
