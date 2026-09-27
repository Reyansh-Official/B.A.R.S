import type { Application } from "./store";

export type NameMatch = "match" | "mismatch" | "unknown";

const IGNORED = new Set(["jr", "sr", "ii", "iii", "iv", "mr", "mrs", "ms", "dr"]);

// "SMITH, JOHN A" and "John Smith" -> {john, smith}. Initials and suffixes are dropped.
function tokens(name: string): Set<string> {
  const [last, first] = name.includes(",") ? name.split(",", 2) : [null, name];
  const ordered = last === null ? first : `${first} ${last}`;
  return new Set(
    ordered
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[^a-z]+/)
      .filter((t) => t.length > 1 && !IGNORED.has(t)),
  );
}

// Same person if every name part of the shorter name appears in the longer one (middle names and hyphenated parts can be missing).
export function namesMatch(a: string | undefined, b: string | undefined): NameMatch {
  if (!a?.trim() || !b?.trim()) return "unknown";
  const [x, y] = [tokens(a), tokens(b)].sort((p, q) => p.size - q.size);
  if (!x.size) return "unknown";
  return [...x].every((t) => y.has(t)) ? "match" : "mismatch";
}

export interface IdentityCheck {
  label: string;
  status: "ok" | "review" | "unknown";
  detail: string;
}

// Advisory checks for the counselor; none of them changes eligibility or readiness.
export function identityChecks(app: Pick<Application, "patient" | "bills" | "docs" | "phoneVerifiedAt">): IdentityCheck[] {
  const name = app.patient.name;
  const checks: IdentityCheck[] = [];

  for (const bill of app.bills) {
    const m = namesMatch(name, bill.patientName);
    checks.push({
      label: `Name on ${bill.billerName} bill`,
      status: m === "match" ? "ok" : m === "mismatch" ? "review" : "unknown",
      detail: m === "unknown" ? "No patient name could be read from this bill." : m === "match" ? `${bill.patientName}` : `Bill is for "${bill.patientName}", application is from "${name}". Could be a guarantor or family member; confirm.`,
    });
  }

  for (const doc of Object.values(app.docs)) {
    for (const c of doc.checks ?? []) {
      if (!c.personName || namesMatch(name, c.personName) !== "mismatch") continue;
      checks.push({ label: `Name on ${c.fileName}`, status: "review", detail: `In the name of "${c.personName}". Fine if it's a household member's document.` });
    }
  }
  const namedDocs = Object.values(app.docs).flatMap((d) => d.checks ?? []).filter((c) => c.personName && namesMatch(name, c.personName) === "match").length;
  if (namedDocs) checks.push({ label: "Names on documents", status: "ok", detail: `${namedDocs} document${namedDocs === 1 ? "" : "s"} in the applicant's name.` });

  checks.push(
    app.phoneVerifiedAt
      ? { label: "Phone", status: "ok", detail: "Verified with a one-time text code." }
      : { label: "Phone", status: "unknown", detail: "Not verified (the patient didn't turn on text reminders)." },
  );
  return checks;
}
