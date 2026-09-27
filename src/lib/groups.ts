import type { Resolution } from "./resolve.ts";
import type { Bill } from "./types.ts";

export type BillResolution = Resolution & { billerPhone?: string };

export interface BillGroup {
  key: string;
  hospitalId: string | null;
  hospitalName: string;
  status: "live" | "pending" | "unknown";
  bills: Bill[];
}

// Groups a patient's bills by the institution whose policy applies. Bills that were never resolved
// (demo data, manual entry) belong to the hospital whose link the patient opened.
export function groupBills(bills: Bill[], resolutions: Record<string, BillResolution>, home: { id: string; name: string }): BillGroup[] {
  const groups = new Map<string, BillGroup>();
  const add = (key: string, init: Omit<BillGroup, "bills">, bill: Bill) => {
    if (!groups.has(key)) groups.set(key, { ...init, bills: [] });
    groups.get(key)!.bills.push(bill);
  };
  for (const bill of bills) {
    const r = resolutions[bill.id];
    if (!r) add(home.id, { key: home.id, hospitalId: home.id, hospitalName: home.name, status: "live" }, bill);
    else if (r.kind === "unknown") add(`unknown-${bill.id}`, { key: `unknown-${bill.id}`, hospitalId: null, hospitalName: bill.billerName, status: "unknown" }, bill);
    else {
      const status = r.kind === "separate_program" ? "live" : r.status === "live" ? "live" : r.status === "pending" ? "pending" : "unknown";
      add(r.hospitalId, { key: r.hospitalId, hospitalId: r.hospitalId, hospitalName: r.hospitalName, status }, bill);
    }
  }
  // The home hospital leads if it has bills; otherwise the first live group does.
  return [...groups.values()].sort((a, b) => rank(a, home.id) - rank(b, home.id));
}

const rank = (g: BillGroup, homeId: string) => (g.hospitalId === homeId ? 0 : g.status === "live" ? 1 : g.status === "pending" ? 2 : 3);
