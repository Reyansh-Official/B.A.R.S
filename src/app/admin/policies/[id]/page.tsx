import { AlertTriangle, CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";
import PolicyReviewActions from "@/components/admin/PolicyReviewActions";
import { Badge, Card } from "@/components/ui";
import { screenEligibility } from "@/lib/rules";
import { createClient } from "@/lib/supabase/server";
import type { Answers, Policy } from "@/lib/types";
import type { ExtractedPolicy } from "@/lib/importer/schema";
import type { Validation } from "@/lib/importer/validate";

const icon = { error: <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />, warning: <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />, ok: <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> };

function Section({ title, cite, children }: { title: string; cite?: string; children: ReactNode }) {
  return (
    <Card>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        {cite && <span className="text-xs text-slate-500">Source: {cite}</span>}
      </div>
      <div className="text-sm text-slate-700">{children}</div>
    </Card>
  );
}

export default async function PolicyReview({ params }: PageProps<"/admin/policies/[id]">) {
  await connection();
  const { id } = await params;
  const db = await createClient();
  const { data: row } = await db.from("policies").select("id, hospital_id, version, status, data, sources, validation, created_at, approved_at, hospitals(name, state, status)").eq("id", id).maybeSingle();
  if (!row) notFound();

  const policy = row.data as Policy;
  const validation = row.validation as Partial<Validation> & { extracted?: ExtractedPolicy; note?: string };
  const x = validation.extracted;
  const checks = [...(validation.checks ?? [])].sort((a, b) => ["error", "warning", "ok"].indexOf(a.severity) - ["error", "warning", "ok"].indexOf(b.severity));
  const hospital = row.hospitals as unknown as { name: string; state: string | null; status: string } | null;
  const sources = row.sources as { kind: string; url: string; title?: string }[];

  const base: Omit<Answers, "annualIncome" | "householdSize"> = { employment: "employed", insured: true, married: false, benefits: [], hasBenefitIncome: false, housing: "rent", thirdPartyInjury: false, appliedForMedicaid: false };
  const samples = [1, 4].flatMap((size) =>
    policy.income_rules.by_household_size[String(size)].band_upper_bounds.map((upper) => {
      const income = upper - 500;
      const r = screenEligibility(policy, { ...base, householdSize: size, annualIncome: income }, 0);
      return { size, income, result: r.discountPct === 100 ? "Free care" : `${r.discountPct}% off` };
    }),
  );

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-4 px-6 py-8 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-4">
        <div>
          <Link href="/admin" className="text-sm text-teal-700 underline">← All hospitals</Link>
          <h1 className="mt-2 text-2xl font-bold">{hospital?.name ?? row.hospital_id}</h1>
          <p className="text-sm text-slate-500">
            {policy.policy.title} · effective {policy.policy.revision} · draft v{row.version} created {new Date(row.created_at).toLocaleString()}
          </p>
          <div className="mt-2 flex gap-2"><Badge tone={row.status === "approved" ? "good" : row.status === "draft" ? "warn" : "info"}>{row.status}</Badge>{validation.status && <Badge tone={validation.status === "pass" ? "good" : validation.status === "fail" ? "bad" : "warn"}>validation: {validation.status}</Badge>}</div>
        </div>

        <Section title={`Automated checks (${checks.filter((c) => c.severity === "error").length} errors, ${checks.filter((c) => c.severity === "warning").length} warnings)`}>
          {validation.note && <p>{validation.note}</p>}
          <ul className="flex flex-col gap-1.5">
            {checks.map((c) => (
              <li key={c.id} className="flex gap-2">{icon[c.severity]}<span>{c.message}</span></li>
            ))}
          </ul>
        </Section>

        <Section title="Income bands" cite={policy.income_rules.source}>
          {x && <p className="mb-2 text-slate-500">{x.income.basisNote}</p>}
          <table className="w-full text-left">
            <thead className="text-xs uppercase text-slate-500"><tr><th className="py-1">Up to</th><th>Discount</th><th>Household of 1</th><th>Household of 4</th></tr></thead>
            <tbody>
              {policy.income_rules.bands_pct_of_mdh.map((pct, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="py-1">{pct}% {policy.income_rules.limit_label === "federal poverty level" ? "FPL" : ""}</td>
                  <td>{policy.income_rules.band_discounts_pct[i]}%</td>
                  <td>${policy.income_rules.by_household_size["1"].band_upper_bounds[i].toLocaleString()}</td>
                  <td>${policy.income_rules.by_household_size["4"].band_upper_bounds[i].toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-500">Above the top band: {policy.income_rules.above_top_band_discount_pct}% off.</p>
        </Section>

        <Section title="Sample households (run through the rules engine)">
          <ul className="grid grid-cols-2 gap-1">
            {samples.map((s, i) => <li key={i}>Household of {s.size}, ${s.income.toLocaleString()}/yr → <b>{s.result}</b></li>)}
          </ul>
        </Section>

        <Section title="Financial hardship" cite={policy.financial_hardship.source}><p>{policy.financial_hardship.rule}</p></Section>
        <Section title="Automatic eligibility" cite={policy.presumptive_eligibility.source}>
          <p className="mb-1">{policy.presumptive_eligibility.result}</p>
          <ul className="list-disc pl-5">{policy.presumptive_eligibility.qualifying.map((q) => <li key={q.id}>{q.label}</li>)}</ul>
        </Section>
        <Section title={`Facilities covered (${policy.facilities.length})`}>
          <ul className="list-disc pl-5">{policy.facilities.map((f) => <li key={f.id}>{f.name}{f.aliases.length > 0 && <span className="text-slate-500"> · also: {f.aliases.join(", ")}</span>}</li>)}</ul>
        </Section>
        <Section title="Billers not covered">
          {policy.not_covered_billers.length ? <ul className="list-disc pl-5">{policy.not_covered_billers.map((b) => <li key={b.id}>{b.name}: {b.next_step}</li>)}</ul> : <p>None named.</p>}
        </Section>
        <Section title="Required documents">
          <ul className="list-disc pl-5">{policy.documents.map((d) => <li key={d.id}>{d.label} <span className="text-slate-500">({d.applies_when.replaceAll("_", " ")}){d.alternatives.length > 0 && `, or: ${d.alternatives.map((a) => a.label).join("; ")}`}</span></li>)}</ul>
        </Section>
        <Section title="Contact and timelines">
          <p>Phone: {policy.contact.phone || "–"} · Email: {policy.contact.email || "–"}</p>
          <p>Apply within {policy.timelines.application_window_days} days · decision within {policy.timelines.final_determination_days} days · missing info due in {policy.timelines.missing_info_response_days} days</p>
        </Section>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
        <Card>
          <h2 className="mb-2 font-semibold">Source documents</h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {sources.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-teal-700 underline">{s.kind.replaceAll("_", " ")} <ExternalLink className="h-3 w-3" /></a></li>
            ))}
          </ul>
        </Card>
        <PolicyReviewActions
          policyId={row.id}
          status={row.status}
          hasErrors={checks.some((c) => c.severity === "error")}
          bands={policy.income_rules.bands_pct_of_mdh.map((pct, i) => ({ maxPct: pct, discount: policy.income_rules.band_discounts_pct[i] }))}
          editableBands={policy.income_rules.limit_label === "federal poverty level"}
        />
      </aside>
    </main>
  );
}
