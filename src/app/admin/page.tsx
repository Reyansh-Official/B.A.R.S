import Link from "next/link";
import { connection } from "next/server";
import AutoRefresh from "@/components/AutoRefresh";
import { Badge } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

const importTone = { queued: "info", searching: "info", extracting: "info", validating: "info", needs_review: "warn", failed: "bad", approved: "good" } as const;

export default async function AdminHome() {
  await connection();
  const db = await createClient();
  const [{ data: hospitals }, { data: imports }] = await Promise.all([
    db.from("hospitals").select("id, name, state, status, policies(id, version, status, created_at)").order("name"),
    db.from("policy_imports").select("id, hospital_id, status, error, created_at, updated_at, policy_id").order("created_at", { ascending: false }).limit(30),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
      <AutoRefresh ms={5000} />
      <section>
        <h1 className="text-2xl font-bold">Hospitals</h1>
        <p className="mb-4 text-slate-600">New hospitals are added automatically when a patient uploads a bill we don&apos;t recognize. Nothing goes live until it&apos;s approved here.</p>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="p-3">Hospital</th><th className="p-3">State</th><th className="p-3">Status</th><th className="p-3">Policies</th></tr>
            </thead>
            <tbody>
              {(hospitals ?? []).map((h) => (
                <tr key={h.id} className="border-t border-slate-100">
                  <td className="p-3 font-medium">{h.name}<span className="block text-xs text-slate-400">{h.id}</span></td>
                  <td className="p-3">{h.state ?? "–"}</td>
                  <td className="p-3"><Badge tone={h.status === "live" ? "good" : h.status === "failed" ? "bad" : "warn"}>{h.status}</Badge></td>
                  <td className="p-3">
                    {(h.policies ?? []).sort((a, b) => b.version - a.version).map((p) => (
                      <Link key={p.id} href={`/admin/policies/${p.id}`} className="mr-3 text-teal-700 underline">v{p.version} {p.status}</Link>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Recent imports</h2>
        <ul className="flex flex-col gap-2">
          {(imports ?? []).map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm">
              <span className="font-medium">{i.hospital_id}</span>
              <span className="text-slate-500">{new Date(i.updated_at).toLocaleString()}</span>
              <Badge tone={importTone[i.status as keyof typeof importTone] ?? "info"}>{i.status.replace("_", " ")}</Badge>
              {i.policy_id && <Link href={`/admin/policies/${i.policy_id}`} className="text-teal-700 underline">Review draft</Link>}
              {i.error && <span className="w-full text-rose-700">{i.error}</span>}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
